import { Injectable, NotFoundException } from "@nestjs/common";
import { PaymentMethod } from "@prisma/client";
import { PrismaService } from "../common/prisma.service";
import { assertOrderTransition, OrderStatus } from "../orders/order-state.machine";
import { MarkPaymentCollectedDto, ToggleRiderOnlineDto } from "./rider.dto";

@Injectable()
export class RidersService {
  constructor(private readonly prisma: PrismaService) {}

  async dashboard(userId: string) {
    const rider = await this.riderForUser(userId);
    const [assigned, pickedUp, deliveredToday] = await Promise.all([
      this.prisma.order.count({ where: { riderId: rider.id, status: "RIDER_ASSIGNED" } }),
      this.prisma.order.count({ where: { riderId: rider.id, status: "PICKED_UP" } }),
      this.prisma.order.count({
        where: {
          riderId: rider.id,
          status: { in: ["DELIVERED", "PAYMENT_COLLECTED", "COMPLETED"] },
          deliveredAt: { gte: this.startOfToday() }
        }
      })
    ]);

    return {
      rider_id: rider.id,
      online: rider.isOnline,
      assigned_orders: assigned,
      picked_up: pickedUp,
      delivered_today: deliveredToday,
      payout_estimate: 0
    };
  }

  async toggleOnline(userId: string, dto: ToggleRiderOnlineDto) {
    const rider = await this.riderForUser(userId);
    return this.prisma.rider.update({
      where: { id: rider.id },
      data: { isOnline: dto.is_online }
    });
  }

  async assignedOrders(userId: string) {
    const rider = await this.riderForUser(userId);
    return this.prisma.order.findMany({
      where: {
        riderId: rider.id,
        status: { in: ["RIDER_ASSIGNED", "PICKED_UP", "DELIVERED", "PAYMENT_PENDING"] }
      },
      orderBy: { createdAt: "asc" },
      include: {
        items: true,
        vendor: { select: { id: true, shopName: true, ownerPhone: true, addressLine: true } },
        payments: true
      }
    });
  }

  async assignedOrderDetail(userId: string, orderId: string) {
    const rider = await this.riderForUser(userId);
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, riderId: rider.id },
      include: {
        items: true,
        vendor: true,
        payments: true,
        collections: true,
        deliveryAssignments: true
      }
    });
    if (!order) {
      throw new NotFoundException("Assigned order not found");
    }
    return order;
  }

  async markPickedUp(userId: string, orderId: string) {
    const rider = await this.riderForUser(userId);
    const order = await this.assignedOrderDetail(userId, orderId);
    assertOrderTransition(order.status as OrderStatus, "PICKED_UP");
    return this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: "PICKED_UP",
        pickedAt: new Date(),
        history: {
          create: {
            fromStatus: order.status,
            toStatus: "PICKED_UP",
            actorId: userId,
            reason: "Rider picked up order"
          }
        },
        deliveryAssignments: {
          updateMany: {
            where: { riderId: rider.id, isActive: true },
            data: { pickedAt: new Date() }
          }
        }
      }
    });
  }

  async markDelivered(userId: string, orderId: string) {
    const rider = await this.riderForUser(userId);
    const order = await this.assignedOrderDetail(userId, orderId);
    assertOrderTransition(order.status as OrderStatus, "DELIVERED");
    return this.prisma.order.update({
      where: { id: order.id },
      data: {
        status: "DELIVERED",
        deliveredAt: new Date(),
        history: {
          create: {
            fromStatus: order.status,
            toStatus: "DELIVERED",
            actorId: userId,
            reason: "Rider delivered order"
          }
        },
        deliveryAssignments: {
          updateMany: {
            where: { riderId: rider.id, isActive: true },
            data: { deliveredAt: new Date() }
          }
        }
      }
    });
  }

  async markPaymentCollected(userId: string, orderId: string, dto: MarkPaymentCollectedDto) {
    const rider = await this.riderForUser(userId);
    const order = await this.assignedOrderDetail(userId, orderId);
    assertOrderTransition(order.status as OrderStatus, "PAYMENT_COLLECTED");
    const existingPayment = order.payments[0];
    const paymentMethodActual = (dto.payment_method_actual ??
      existingPayment?.paymentMethodRequested ??
      order.paymentMethod) as PaymentMethod;

    return this.prisma.$transaction(async (tx) => {
      const collection = await tx.paymentCollection.create({
        data: {
          orderId: order.id,
          collectorType: "RIDER",
          collectorId: rider.id,
          amount: dto.amount,
          status: "COLLECTED_UNVERIFIED",
          note: dto.note
        }
      });

      const payment = existingPayment
        ? await tx.payment.update({
            where: { id: existingPayment.id },
            data: {
              paymentMethodActual,
              collectorType: "RIDER",
              collectorId: rider.id,
              status: "COLLECTED_UNVERIFIED",
              adminVerificationStatus: "PENDING",
              amountCollected: dto.amount,
              collectionTimestamp: new Date(),
              paymentProofReference: dto.payment_proof_reference
            }
          })
        : await tx.payment.create({
            data: {
              orderId: order.id,
              method: order.paymentMethod,
              paymentMethodRequested: order.paymentMethod,
              paymentMethodActual,
              collectorType: "RIDER",
              collectorId: rider.id,
              status: "COLLECTED_UNVERIFIED",
              adminVerificationStatus: "PENDING",
              amount: order.totalAmount,
              amountCollected: dto.amount,
              collectionTimestamp: new Date(),
              paymentProofReference: dto.payment_proof_reference
            }
          });

      await tx.paymentReconciliationEvent.create({
        data: {
          orderId: order.id,
          paymentId: payment.id,
          fromStatus: existingPayment?.status ?? null,
          toStatus: "COLLECTED_UNVERIFIED",
          amount: dto.amount,
          note: dto.note ?? "Payment collected by rider",
          createdBy: userId
        }
      });

      await tx.order.update({
        where: { id: order.id },
        data: {
          status: "PAYMENT_COLLECTED",
          paymentStatus: "COLLECTED_UNVERIFIED",
          history: {
            create: {
              fromStatus: order.status,
              toStatus: "PAYMENT_COLLECTED",
              actorId: userId,
              reason: dto.note ?? "Payment collected by rider"
            }
          }
        }
      });

      return { payment, collection };
    });
  }

  private async riderForUser(userId: string) {
    const rider = await this.prisma.rider.findUnique({
      where: { userId }
    });
    if (!rider) {
      throw new NotFoundException("Rider profile not found for user");
    }
    return rider;
  }

  private startOfToday() {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }
}
