import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PaymentMethod, Prisma } from "@prisma/client";
import { PrismaService } from "../common/prisma.service";
import { assertOrderTransition, OrderStatus } from "../orders/order-state.machine";
import {
  CreateRiderKycDocumentDto,
  MarkPaymentCollectedDto,
  RejectAssignedOrderDto,
  SubmitDeliveryProofDto,
  ToggleRiderOnlineDto,
  UpdateRiderProfileDto
} from "./rider.dto";

@Injectable()
export class RidersService {
  constructor(private readonly prisma: PrismaService) {}

  async profile(userId: string) {
    const rider = await this.prisma.rider.findUnique({
      where: { userId },
      include: {
        user: true,
        serviceZone: true,
        kycDocuments: { orderBy: { createdAt: "desc" } }
      }
    });
    if (!rider) {
      throw new NotFoundException("Rider profile not found for user");
    }
    return rider;
  }

  async updateProfile(userId: string, dto: UpdateRiderProfileDto) {
    const rider = await this.riderForUser(userId);
    const updated = await this.prisma.$transaction(async (tx) => {
      if (dto.name !== undefined) {
        await tx.user.update({
          where: { id: userId },
          data: { name: dto.name }
        });
      }

      const riderUpdate: Prisma.RiderUpdateInput = {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.vehicle_type !== undefined ? { vehicleType: dto.vehicle_type } : {}),
        ...(dto.vehicle_number !== undefined ? { vehicleNumber: dto.vehicle_number } : {})
      };

      const saved = await tx.rider.update({
        where: { id: rider.id },
        data: riderUpdate,
        include: {
          user: true,
          serviceZone: true,
          kycDocuments: { orderBy: { createdAt: "desc" } }
        }
      });

      await this.auditRiderAction(tx, {
        actorId: userId,
        action: "rider.profile_updated",
        entityType: "rider",
        entityId: rider.id,
        reason: "Rider updated profile",
        metadata: {
          updatedFields: Object.keys(dto)
        }
      });

      return saved;
    });

    return updated;
  }

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
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.rider.update({
        where: { id: rider.id },
        data: { isOnline: dto.is_online }
      });

      await this.auditRiderAction(tx, {
        actorId: userId,
        action: "rider.availability_updated",
        entityType: "rider",
        entityId: rider.id,
        reason: dto.is_online ? "Rider went online" : "Rider went offline",
        metadata: { isOnline: dto.is_online }
      });

      return updated;
    });
  }

  async kycDocuments(userId: string) {
    const rider = await this.riderForUser(userId);
    return this.prisma.riderKycDocument.findMany({
      where: { riderId: rider.id },
      orderBy: { createdAt: "desc" }
    });
  }

  async createKycDocument(userId: string, dto: CreateRiderKycDocumentDto) {
    const rider = await this.riderForUser(userId);
    return this.prisma.$transaction(async (tx) => {
      const document = await tx.riderKycDocument.create({
        data: {
          riderId: rider.id,
          type: dto.type,
          documentUrl: dto.document_url
        }
      });

      await this.auditRiderAction(tx, {
        actorId: userId,
        action: "rider.kyc_document_submitted",
        entityType: "rider_kyc_document",
        entityId: document.id,
        reason: `Rider submitted ${dto.type} document`,
        metadata: { riderId: rider.id, type: dto.type }
      });

      return document;
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
        payments: true,
        deliveryAssignments: true,
        deliveryProofs: true
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
        deliveryAssignments: true,
        deliveryProofs: true
      }
    });
    if (!order) {
      throw new NotFoundException("Assigned order not found");
    }
    return order;
  }

  async orderHistory(userId: string) {
    const rider = await this.riderForUser(userId);
    const assignments = await this.prisma.deliveryAssignment.findMany({
      where: { riderId: rider.id },
      orderBy: { assignedAt: "desc" },
      take: 100,
      include: {
        order: {
          include: {
            items: true,
            vendor: { select: { id: true, shopName: true, ownerPhone: true, addressLine: true } },
            payments: true,
            deliveryProofs: true
          }
        }
      }
    });

    return assignments.map((assignment) => ({
      ...assignment.order,
      rider_assignment: {
        id: assignment.id,
        assignedAt: assignment.assignedAt,
        acceptedAt: assignment.acceptedAt,
        rejectedAt: assignment.rejectedAt,
        rejectionReason: assignment.rejectionReason,
        pickedAt: assignment.pickedAt,
        deliveredAt: assignment.deliveredAt,
        isActive: assignment.isActive
      }
    }));
  }

  async acceptAssignedOrder(userId: string, orderId: string) {
    const rider = await this.riderForUser(userId);
    const order = await this.assignedOrderDetail(userId, orderId);
    if (order.status !== "RIDER_ASSIGNED") {
      throw new BadRequestException("Only assigned orders awaiting rider action can be accepted");
    }

    await this.prisma.$transaction(async (tx) => {
      const result = await tx.deliveryAssignment.updateMany({
        where: { orderId, riderId: rider.id, isActive: true },
        data: {
          acceptedAt: new Date(),
          rejectedAt: null,
          rejectionReason: null
        }
      });
      if (result.count === 0) {
        throw new NotFoundException("Active rider assignment not found");
      }

      await this.auditRiderAction(tx, {
        actorId: userId,
        action: "rider.order_accepted",
        entityType: "order",
        entityId: orderId,
        reason: "Rider accepted assigned order",
        metadata: { riderId: rider.id, status: order.status }
      });
    });

    return this.assignedOrderDetail(userId, orderId);
  }

  async rejectAssignedOrder(userId: string, orderId: string, dto: RejectAssignedOrderDto) {
    const rider = await this.riderForUser(userId);
    const order = await this.assignedOrderDetail(userId, orderId);
    assertOrderTransition(order.status as OrderStatus, "RIDER_FAILED");

    return this.prisma.$transaction(async (tx) => {
      const result = await tx.deliveryAssignment.updateMany({
        where: { orderId, riderId: rider.id, isActive: true },
        data: {
          rejectedAt: new Date(),
          rejectionReason: dto.reason,
          isActive: false
        }
      });
      if (result.count === 0) {
        throw new NotFoundException("Active rider assignment not found");
      }

      const updated = await tx.order.update({
        where: { id: orderId },
        data: {
          riderId: null,
          status: "RIDER_FAILED",
          history: {
            create: {
              fromStatus: order.status,
              toStatus: "RIDER_FAILED",
              actorId: userId,
              reason: dto.reason
            }
          }
        },
        include: {
          items: true,
          vendor: true,
          payments: true,
          collections: true,
          deliveryAssignments: true,
          deliveryProofs: true
        }
      });

      await this.auditRiderAction(tx, {
        actorId: userId,
        action: "rider.order_rejected",
        entityType: "order",
        entityId: orderId,
        reason: dto.reason,
        metadata: { riderId: rider.id, fromStatus: order.status, toStatus: "RIDER_FAILED" }
      });

      return updated;
    });
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

  async deliveryProofsForOrder(userId: string, orderId: string) {
    const rider = await this.riderForUser(userId);
    await this.assignedOrderDetail(userId, orderId);
    return this.prisma.deliveryProof.findMany({
      where: { orderId, riderId: rider.id },
      orderBy: { createdAt: "desc" }
    });
  }

  async submitDeliveryProof(userId: string, orderId: string, dto: SubmitDeliveryProofDto) {
    const rider = await this.riderForUser(userId);
    const order = await this.assignedOrderDetail(userId, orderId);
    if (!["PICKED_UP", "DELIVERED", "PAYMENT_PENDING", "PAYMENT_COLLECTED", "COMPLETED"].includes(order.status)) {
      throw new BadRequestException("Delivery proof can be submitted after pickup");
    }
    if (!dto.proof_url && !dto.note) {
      throw new BadRequestException("Delivery proof requires a proof URL or note");
    }

    return this.prisma.$transaction(async (tx) => {
      const proof = await tx.deliveryProof.create({
        data: {
          orderId,
          riderId: rider.id,
          proofUrl: dto.proof_url,
          note: dto.note,
          status: "SUBMITTED"
        }
      });

      await this.auditRiderAction(tx, {
        actorId: userId,
        action: "rider.delivery_proof_submitted",
        entityType: "delivery_proof",
        entityId: proof.id,
        reason: "Rider submitted delivery proof",
        metadata: { riderId: rider.id, orderId, status: proof.status }
      });

      return proof;
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

  private auditRiderAction(
    tx: Prisma.TransactionClient,
    input: {
      actorId: string;
      action: string;
      entityType: string;
      entityId: string;
      reason: string;
      metadata?: Record<string, unknown>;
    }
  ) {
    return tx.auditLog.create({
      data: {
        actorId: input.actorId,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        reason: input.reason,
        metadata: input.metadata as Prisma.InputJsonValue | undefined
      }
    });
  }
}
