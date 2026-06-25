import { Test, TestingModule } from "@nestjs/testing";
import { PaymentsService } from "./payments.service";
import { RazorpayService } from "./razorpay.service";
import { PrismaService } from "../common/prisma.service";
import { ConfigService } from "@nestjs/config";
import { DomainEventBus } from "../internal-events/domain-event-bus.service";
import { BadRequestException, NotFoundException } from "@nestjs/common";

describe("PaymentsService", () => {
  let service: PaymentsService;
  let prisma: any;
  let razorpay: any;
  let config: any;
  let eventBus: any;

  beforeEach(async () => {
    prisma = {
      customer: {
        findUnique: jest.fn(),
      },
      order: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      payment: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn((arg) => {
        if (typeof arg === "function") {
          return arg(prisma);
        }
        return Promise.all(arg);
      }),
    };

    razorpay = {
      createOrder: jest.fn(),
    };

    config = {
      get: jest.fn((key) => {
        if (key === "RAZORPAY_KEY_SECRET") return "test_secret";
        if (key === "RAZORPAY_WEBHOOK_SECRET") return "test_webhook_secret";
        return null;
      }),
    };

    eventBus = {
      publish: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: prisma },
        { provide: RazorpayService, useValue: razorpay },
        { provide: ConfigService, useValue: config },
        { provide: DomainEventBus, useValue: eventBus },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("createRazorpayOrder", () => {
    it("should throw NotFound if customer does not exist", async () => {
      prisma.customer.findUnique.mockResolvedValue(null);
      await expect(service.createRazorpayOrder("user1", "order1")).rejects.toThrow(
        NotFoundException
      );
    });

    it("should throw NotFound if order does not exist", async () => {
      prisma.customer.findUnique.mockResolvedValue({ id: "cust1" });
      prisma.order.findFirst.mockResolvedValue(null);
      await expect(service.createRazorpayOrder("user1", "order1")).rejects.toThrow(
        NotFoundException
      );
    });

    it("should create razorpay order and return credentials", async () => {
      prisma.customer.findUnique.mockResolvedValue({ id: "cust1" });
      prisma.order.findFirst.mockResolvedValue({
        id: "order1",
        customerId: "cust1",
        paymentMethod: "RAZORPAY",
        status: "PAYMENT_PENDING",
        totalAmount: 150.0,
      });
      prisma.payment.findFirst.mockResolvedValue(null);
      prisma.payment.create.mockResolvedValue({ id: "pay1", amount: 150.0 });
      razorpay.createOrder.mockResolvedValue({ id: "rzp_order_123" });

      const result = await service.createRazorpayOrder("user1", "order1");
      expect(result).toEqual({
        gatewayOrderId: "rzp_order_123",
        amount: 150.0,
        currency: "INR",
        keyId: "rzp_test_placeholder_key_id",
      });
    });
  });

  describe("verifyRazorpayPayment", () => {
    it("should throw BadRequest if signature is invalid", async () => {
      prisma.customer.findUnique.mockResolvedValue({ id: "cust1" });
      prisma.order.findFirst.mockResolvedValue({
        id: "order1",
        customerId: "cust1",
        paymentMethod: "RAZORPAY",
        payments: [{ id: "pay1", gatewayOrderId: "rzp_order_123", amount: 150.0 }],
      });

      await expect(
        service.verifyRazorpayPayment("user1", {
          orderId: "order1",
          razorpayOrderId: "rzp_order_123",
          razorpayPaymentId: "rzp_pay_123",
          razorpaySignature: "invalid_sig",
        })
      ).rejects.toThrow(BadRequestException);
    });

    it("should verify signature and update payment status to SUCCESS", async () => {
      prisma.customer.findUnique.mockResolvedValue({ id: "cust1" });
      prisma.order.findFirst.mockResolvedValue({
        id: "order1",
        customerId: "cust1",
        paymentMethod: "RAZORPAY",
        payments: [{ id: "pay1", gatewayOrderId: "rzp_order_123", amount: 150.0 }],
      });

      const result = await service.verifyRazorpayPayment("user1", {
        orderId: "order1",
        razorpayOrderId: "rzp_order_123",
        razorpayPaymentId: "rzp_pay_123",
        razorpaySignature: "mock_signature",
      });

      expect(result.success).toBe(true);
      expect(prisma.payment.update).toHaveBeenCalled();
      expect(prisma.order.update).toHaveBeenCalled();
      expect(eventBus.publish).toHaveBeenCalledWith(
        "payment.collected",
        expect.any(Object),
        expect.any(Object)
      );
    });
  });

  describe("processWebhook", () => {
    it("should throw BadRequest if webhook signature is invalid", async () => {
      await expect(
        service.processWebhook("raw_body", "invalid_signature", {})
      ).rejects.toThrow(BadRequestException);
    });

    it("should skip processing if payment already in SUCCESS status", async () => {
      const payload = {
        event: "payment.captured",
        payload: {
          payment: {
            entity: {
              id: "rzp_pay_123",
              order_id: "rzp_order_123",
            },
          },
        },
      };

      prisma.payment.findUnique.mockResolvedValue({
        id: "pay1",
        gatewayOrderId: "rzp_order_123",
        status: "SUCCESS",
        order: { paymentMethod: "RAZORPAY" },
      });

      const result = await service.processWebhook(
        "raw_body",
        "mock_webhook_signature",
        payload
      );

      expect(result).toEqual({ received: true });
      expect(prisma.payment.update).not.toHaveBeenCalled();
    });

    it("should process payment.captured successfully", async () => {
      const payload = {
        event: "payment.captured",
        payload: {
          payment: {
            entity: {
              id: "rzp_pay_123",
              order_id: "rzp_order_123",
            },
          },
        },
      };

      prisma.payment.findUnique.mockResolvedValue({
        id: "pay1",
        orderId: "order1",
        gatewayOrderId: "rzp_order_123",
        status: "PROCESSING",
        amount: 150.0,
        order: { paymentMethod: "RAZORPAY" },
      });

      const result = await service.processWebhook(
        "raw_body",
        "mock_webhook_signature",
        payload
      );

      expect(result).toEqual({ received: true });
      expect(prisma.payment.update).toHaveBeenCalled();
      expect(prisma.order.update).toHaveBeenCalled();
      expect(eventBus.publish).toHaveBeenCalledWith(
        "payment.collected",
        expect.any(Object),
        expect.any(Object)
      );
    });

    it("should process payment.failed successfully", async () => {
      const payload = {
        event: "payment.failed",
        payload: {
          payment: {
            entity: {
              id: "rzp_pay_123",
              order_id: "rzp_order_123",
              error_description: "Card failed",
            },
          },
        },
      };

      prisma.payment.findUnique.mockResolvedValue({
        id: "pay1",
        orderId: "order1",
        gatewayOrderId: "rzp_order_123",
        status: "PROCESSING",
        amount: 150.0,
        order: { paymentMethod: "RAZORPAY" },
      });

      const result = await service.processWebhook(
        "raw_body",
        "mock_webhook_signature",
        payload
      );

      expect(result).toEqual({ received: true });
      expect(prisma.payment.update).toHaveBeenCalled();
      expect(prisma.order.update).toHaveBeenCalled();
    });
  });
});
