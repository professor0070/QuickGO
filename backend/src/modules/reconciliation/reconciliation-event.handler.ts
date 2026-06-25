import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { Prisma, ReconciliationAlertStatus } from "@prisma/client";
import { PrismaService } from "../common/prisma.service";
import {
  DomainEventBus,
  EventHandlerRegistration
} from "../internal-events/domain-event-bus.service";
import { DomainEvent } from "../internal-events/domain-event.types";

type AlertType = "COLLECTION_PENDING" | "AMOUNT_MISMATCH" | "PAYMENT_DISPUTE";
type AlertSeverity = "MEDIUM" | "HIGH" | "URGENT";

const FINAL_RECONCILIATION_STATUSES = new Set(["VERIFIED", "SETTLED", "RECONCILED"]);
const MISMATCH_RECONCILIATION_STATUSES = new Set(["SHORT_COLLECTED", "OVER_COLLECTED"]);

@Injectable()
export class ReconciliationEventHandler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ReconciliationEventHandler.name);
  private readonly registrations: EventHandlerRegistration[] = [];

  constructor(
    private readonly eventBus: DomainEventBus,
    private readonly prisma: PrismaService
  ) {}

  onModuleInit() {
    this.registrations.push(
      this.eventBus.on("payment.collected", async (event) => {
        this.logger.log(
          `reconciliation_pending order=${event.payload.orderId} amount=${event.payload.amount}`
        );
        try {
          await this.persistCollectionAlerts(event);
          await this.prisma.auditLog.create({
            data: {
              action: "PAYMENT_COLLECTED",
              entityType: "Payment",
              entityId: event.payload.orderId,
              reason: `Payment collection recorded of amount: ${event.payload.amount}`,
              metadata: { eventId: event.id, payload: event.payload }
            }
          });
        } catch (err) {
          this.logger.error("Failed to persist reconciliation data for payment collection", err);
        }
      }),
      this.eventBus.on("payment.reconciled", async (event) => {
        this.logger.log(
          `reconciliation_completed payment=${event.payload.paymentId} reason=${event.payload.reason}`
        );
        try {
          await this.resolveReconciliationAlerts(event);
          await this.prisma.auditLog.create({
            data: {
              action: "PAYMENT_RECONCILED",
              entityType: "Payment",
              entityId: event.payload.paymentId,
              reason: event.payload.reason || "Reconciled by admin",
              metadata: { eventId: event.id, payload: event.payload }
            }
          });
        } catch (err) {
          this.logger.error("Failed to persist reconciliation data for payment reconciliation", err);
        }
      })
    );
  }

  onModuleDestroy() {
    for (const registration of this.registrations) {
      registration.unsubscribe();
    }
  }

  private async persistCollectionAlerts(event: DomainEvent<"payment.collected">) {
    const payment = await this.paymentForCollection(event.payload);
    if (!payment) {
      this.logger.warn(`reconciliation_alert_skipped order=${event.payload.orderId} payment=missing`);
      return;
    }

    const expectedAmount = this.asMoney(payment.amount ?? payment.order?.totalAmount);
    const collectedAmount = this.asMoney(event.payload.amount);
    const metadata = this.alertMetadata(event);
    const isDigital = payment.method === "RAZORPAY" || payment.method === "UPI";

    if (!isDigital) {
      await this.ensureOpenAlert({
        orderId: payment.orderId,
        paymentId: payment.id,
        type: "COLLECTION_PENDING",
        severity: "MEDIUM",
        expectedAmount,
        collectedAmount,
        message: "Payment collection is awaiting admin reconciliation",
        metadata
      });
    }

    if (this.amountsDiffer(collectedAmount, expectedAmount)) {
      await this.ensureOpenAlert({
        orderId: payment.orderId,
        paymentId: payment.id,
        type: "AMOUNT_MISMATCH",
        severity: "HIGH",
        expectedAmount,
        collectedAmount,
        message: `Collected amount ${collectedAmount.toFixed(2)} does not match expected ${expectedAmount.toFixed(2)}`,
        metadata
      });
    }
  }

  private async resolveReconciliationAlerts(event: DomainEvent<"payment.reconciled">) {
    const status = event.payload.status;
    const resolutionMetadata = {
      eventId: event.id,
      eventName: event.name,
      reason: event.payload.reason,
      status: status ?? null
    };

    await this.prisma.paymentReconciliationAlert.updateMany({
      where: {
        paymentId: event.payload.paymentId,
        type: "COLLECTION_PENDING",
        status: "OPEN"
      },
      data: {
        status: "RESOLVED",
        resolvedAt: new Date(),
        resolvedBy: event.metadata.actorId,
        metadata: resolutionMetadata
      }
    });

    if (status && FINAL_RECONCILIATION_STATUSES.has(status)) {
      await this.prisma.paymentReconciliationAlert.updateMany({
        where: {
          paymentId: event.payload.paymentId,
          status: "OPEN"
        },
        data: {
          status: "RESOLVED",
          resolvedAt: new Date(),
          resolvedBy: event.metadata.actorId,
          metadata: resolutionMetadata
        }
      });
      return;
    }

    if (!status) {
      return;
    }

    if (MISMATCH_RECONCILIATION_STATUSES.has(status)) {
      await this.ensurePostReconcileAlert(event, "AMOUNT_MISMATCH", "HIGH");
      return;
    }

    if (status === "DISPUTED") {
      await this.ensurePostReconcileAlert(event, "PAYMENT_DISPUTE", "URGENT");
    }
  }

  private async ensurePostReconcileAlert(
    event: DomainEvent<"payment.reconciled">,
    type: AlertType,
    severity: AlertSeverity
  ) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: event.payload.paymentId },
      include: { order: true }
    });
    if (!payment) {
      return;
    }

    const expectedAmount = this.asMoney(payment.amount);
    const collectedAmount = this.asMoney(payment.amountCollected);
    await this.ensureOpenAlert({
      orderId: payment.orderId,
      paymentId: payment.id,
      type,
      severity,
      expectedAmount,
      collectedAmount,
      message:
        type === "PAYMENT_DISPUTE"
          ? "Payment is under dispute after admin reconciliation"
          : `Reconciled amount ${collectedAmount.toFixed(2)} does not match expected ${expectedAmount.toFixed(2)}`,
      metadata: {
        eventId: event.id,
        eventName: event.name,
        reason: event.payload.reason,
        status: event.payload.status ?? null
      }
    });
  }

  private async paymentForCollection(payload: {
    orderId: string;
    paymentId?: string;
  }): Promise<any | null> {
    if (payload.paymentId) {
      return this.prisma.payment.findUnique({
        where: { id: payload.paymentId },
        include: { order: true }
      });
    }

    const order = await this.prisma.order.findUnique({
      where: { id: payload.orderId },
      include: {
        payments: {
          orderBy: { createdAt: "desc" },
          take: 1
        }
      }
    });
    const payment = order?.payments[0];
    return payment && order ? { ...payment, order } : null;
  }

  private async ensureOpenAlert(input: {
    orderId: string;
    paymentId?: string;
    type: AlertType;
    severity: AlertSeverity;
    expectedAmount: number;
    collectedAmount: number;
    message: string;
    metadata: Prisma.InputJsonObject;
  }) {
    const where: Prisma.PaymentReconciliationAlertWhereInput = {
      orderId: input.orderId,
      type: input.type,
      status: ReconciliationAlertStatus.OPEN,
      ...(input.paymentId ? { paymentId: input.paymentId } : {})
    };
    const existing = await this.prisma.paymentReconciliationAlert.findFirst({ where });
    const data = {
      severity: input.severity,
      expectedAmount: input.expectedAmount,
      collectedAmount: input.collectedAmount,
      message: input.message,
      metadata: input.metadata
    };

    if (existing) {
      return this.prisma.paymentReconciliationAlert.update({
        where: { id: existing.id },
        data
      });
    }

    return this.prisma.paymentReconciliationAlert.create({
      data: {
        orderId: input.orderId,
        paymentId: input.paymentId,
        type: input.type,
        ...data
      }
    });
  }

  private alertMetadata(event: DomainEvent<"payment.collected">): Prisma.InputJsonObject {
    return {
      eventId: event.id,
      eventName: event.name,
      payload: event.payload,
      source: event.metadata.source,
      actorId: event.metadata.actorId ?? null,
      requestId: event.metadata.requestId ?? null,
      idempotencyKey: event.metadata.idempotencyKey ?? null
    };
  }

  private asMoney(value: unknown): number {
    return Number(value ?? 0);
  }

  private amountsDiffer(left: number, right: number) {
    return Math.abs(left - right) >= 0.01;
  }
}
