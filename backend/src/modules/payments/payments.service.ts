import { Injectable, Logger, BadRequestException, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../common/prisma.service";
import { RazorpayService } from "./razorpay.service";
import { DomainEventBus } from "../internal-events/domain-event-bus.service";
import { verifyRazorpaySignature, verifyRazorpayWebhookSignature } from "../../common/crypto.util";
import { PaymentStatus, OrderStatus } from "@prisma/client";

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly razorpay: RazorpayService,
    private readonly config: ConfigService,
    private readonly eventBus: DomainEventBus
  ) {}

  async createRazorpayOrder(userId: string, orderId: string) {
    // Verify the customer exists
    const customer = await this.prisma.customer.findUnique({
      where: { userId }
    });
    if (!customer) {
      throw new NotFoundException("Customer profile not found");
    }

    // Retrieve order and verify ownership
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, customerId: customer.id }
    });
    if (!order) {
      throw new NotFoundException("Order not found");
    }

    if (order.paymentMethod !== "RAZORPAY" && order.paymentMethod !== "UPI") {
      throw new BadRequestException("Order does not require online checkout");
    }

    if (order.status !== "PAYMENT_PENDING") {
      throw new BadRequestException("Order is not awaiting payment");
    }

    // Retrieve or create payment record
    let payment = await this.prisma.payment.findFirst({
      where: { orderId: order.id }
    });

    if (!payment) {
      payment = await this.prisma.payment.create({
        data: {
          orderId: order.id,
          method: order.paymentMethod,
          status: "PENDING",
          amount: order.totalAmount
        }
      });
    }

    // Call Razorpay API to generate the gateway order
    const razorpayOrder = await this.razorpay.createOrder(
      Number(order.totalAmount),
      order.id
    );

    // Update payment and order to PROCESSING state
    await this.prisma.$transaction([
      this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          gatewayOrderId: razorpayOrder.id,
          status: "PROCESSING"
        }
      }),
      this.prisma.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: "PROCESSING"
        }
      })
    ]);

    return {
      gatewayOrderId: razorpayOrder.id,
      amount: Number(order.totalAmount),
      currency: "INR",
      keyId: this.config.get<string>("RAZORPAY_KEY_ID") || "rzp_test_placeholder_key_id"
    };
  }

  async verifyRazorpayPayment(userId: string, dto: {
    orderId: string;
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
  }) {
    const customer = await this.prisma.customer.findUnique({
      where: { userId }
    });
    if (!customer) {
      throw new NotFoundException("Customer profile not found");
    }

    const order = await this.prisma.order.findFirst({
      where: { id: dto.orderId, customerId: customer.id },
      include: { payments: true }
    });
    if (!order) {
      throw new NotFoundException("Order not found");
    }

    const payment = order.payments.find(p => p.gatewayOrderId === dto.razorpayOrderId);
    if (!payment) {
      throw new NotFoundException("Payment transaction matching the order ID and gateway order ID not found");
    }

    if (payment.status === "SUCCESS") {
      this.logger.log(`Payment for order ${dto.orderId} is already verified and marked SUCCESS.`);
      return {
        success: true,
        message: "Payment verified and order placed successfully"
      };
    }

    const secret = this.config.get<string>("RAZORPAY_KEY_SECRET") || "rzp_test_placeholder_key_secret";
    
    // Check if mock signature or valid cryptographic signature
    const isProduction = this.config.get<string>("NODE_ENV") === "production";
    const isValid = 
      (!isProduction && dto.razorpaySignature === "mock_signature") ||
      verifyRazorpaySignature(dto.razorpayOrderId, dto.razorpayPaymentId, dto.razorpaySignature, secret);

    if (!isValid) {
      await this.prisma.$transaction([
        this.prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: "FAILED",
            errorReason: "Signature verification failed"
          }
        }),
        this.prisma.order.update({
          where: { id: order.id },
          data: {
            paymentStatus: "FAILED"
          }
        })
      ]);
      throw new BadRequestException("Payment verification failed: invalid signature");
    }

    // If valid signature, finalize payment and order placement
    await this.prisma.$transaction([
      this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: "SUCCESS",
          gatewayPaymentId: dto.razorpayPaymentId,
          gatewaySignature: dto.razorpaySignature,
          adminVerificationStatus: "VERIFIED",
          amountCollected: payment.amount
        }
      }),
      this.prisma.order.update({
        where: { id: order.id },
        data: {
          status: "PLACED",
          paymentStatus: "SUCCESS"
        }
      })
    ]);

    // Publish payment.collected domain event
    await this.eventBus.publish("payment.collected", {
      orderId: order.id,
      paymentId: payment.id,
      amount: Number(payment.amount),
      collectorType: "ADMIN",
      paymentMethodActual: order.paymentMethod
    }, { source: "payments.service", actorId: userId });

    return {
      success: true,
      message: "Payment verified and order placed successfully"
    };
  }

  async processWebhook(rawBody: string, signature: string, payload: any) {
    const secret = this.config.get<string>("RAZORPAY_WEBHOOK_SECRET") || "rzp_test_placeholder_webhook_secret";

    const isProduction = this.config.get<string>("NODE_ENV") === "production";
    const isValid = 
      (!isProduction && signature === "mock_webhook_signature") ||
      verifyRazorpayWebhookSignature(rawBody, signature, secret);

    if (!isValid) {
      this.logger.warn("Razorpay Webhook signature verification failed");
      throw new BadRequestException("Invalid webhook signature");
    }

    const event = payload.event;
    const paymentEntity = payload.payload?.payment?.entity;
    if (!paymentEntity || !paymentEntity.order_id) {
      this.logger.warn("Razorpay Webhook missing payment entity or order_id");
      return { received: true };
    }

    const gatewayOrderId = paymentEntity.order_id;
    const payment = await this.prisma.payment.findUnique({
      where: { gatewayOrderId },
      include: { order: true }
    });

    if (!payment) {
      this.logger.warn(`No payment record found for gatewayOrderId: ${gatewayOrderId}`);
      return { received: true };
    }

    if (event === "payment.captured") {
      if (payment.status === "SUCCESS") {
        this.logger.log(`Payment ${payment.id} is already in SUCCESS state.`);
        return { received: true };
      }

      await this.prisma.$transaction([
        this.prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: "SUCCESS",
            gatewayPaymentId: paymentEntity.id,
            webhookPayload: payload,
            adminVerificationStatus: "VERIFIED",
            amountCollected: payment.amount
          }
        }),
        this.prisma.order.update({
          where: { id: payment.orderId },
          data: {
            status: "PLACED",
            paymentStatus: "SUCCESS"
          }
        })
      ]);

      await this.eventBus.publish("payment.collected", {
        orderId: payment.orderId,
        paymentId: payment.id,
        amount: Number(payment.amount),
        collectorType: "ADMIN",
        paymentMethodActual: payment.order.paymentMethod
      }, { source: "payments.webhook", actorId: "system" });

      this.logger.log(`Webhook successfully processed payment.captured for order ${payment.orderId}`);
    } else if (event === "payment.failed") {
      if (payment.status === "FAILED") {
        return { received: true };
      }

      await this.prisma.$transaction([
        this.prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: "FAILED",
            errorReason: paymentEntity.error_description || "Payment failed at gateway",
            webhookPayload: payload
          }
        }),
        this.prisma.order.update({
          where: { id: payment.orderId },
          data: {
            paymentStatus: "FAILED"
          }
        })
      ]);

      this.logger.log(`Webhook successfully processed payment.failed for order ${payment.orderId}`);
    }

    return { received: true };
  }
}
