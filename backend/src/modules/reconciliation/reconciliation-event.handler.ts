import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaService } from "../common/prisma.service";
import {
  DomainEventBus,
  EventHandlerRegistration
} from "../internal-events/domain-event-bus.service";

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
          this.logger.error("Failed to log audit event for payment collection", err);
        }
      }),
      this.eventBus.on("payment.reconciled", async (event) => {
        this.logger.log(
          `reconciliation_completed payment=${event.payload.paymentId} reason=${event.payload.reason}`
        );
        try {
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
          this.logger.error("Failed to log audit event for payment reconciliation", err);
        }
      })
    );
  }

  onModuleDestroy() {
    for (const registration of this.registrations) {
      registration.unsubscribe();
    }
  }
}

