import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import {
  DomainEventBus,
  EventHandlerRegistration
} from "../internal-events/domain-event-bus.service";
import { DomainEvent, DomainEventName } from "../internal-events/domain-event.types";
import { PrismaService } from "../common/prisma.service";

const auditedEvents: DomainEventName[] = [
  "auth.otp_verified",
  "order.placed",
  "order.cancelled",
  "vendor.order_accepted",
  "vendor.order_rejected",
  "vendor.order_preparing",
  "vendor.order_ready_for_pickup",
  "delivery.rider_assigned",
  "delivery.rider_reassigned",
  "delivery.picked_up",
  "delivery.delivered",
  "payment.collected",
  "payment.reconciled",
  "support.ticket_created",
  "compliance.privacy_request_created",
  "compliance.privacy_request_updated"
];

@Injectable()
export class AuditEventHandler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AuditEventHandler.name);
  private readonly registrations: EventHandlerRegistration[] = [];

  constructor(
    private readonly eventBus: DomainEventBus,
    private readonly prisma: PrismaService
  ) {}

  onModuleInit() {
    for (const eventName of auditedEvents) {
      this.registrations.push(
        this.eventBus.on(eventName, async (event) => {
          await this.prisma.auditLog.create({
            data: {
              actorId: event.metadata.actorId,
              action: event.name,
              entityType: this.entityType(event),
              entityId: this.entityId(event),
              reason: this.reason(event),
              metadata: {
                eventId: event.id,
                requestId: event.metadata.requestId ?? null,
                idempotencyKey: event.metadata.idempotencyKey ?? null,
                source: event.metadata.source,
                payload: event.payload
              }
            }
          });
          this.logger.log(
            `audit:${event.name} actor=${event.metadata.actorId ?? "system"} request=${event.metadata.requestId ?? "none"}`
          );
        })
      );
    }
  }

  onModuleDestroy() {
    for (const registration of this.registrations) {
      registration.unsubscribe();
    }
  }

  private entityType(event: DomainEvent) {
    if ("orderId" in event.payload) {
      return "order";
    }
    if ("paymentId" in event.payload) {
      return "payment";
    }
    if ("ticketId" in event.payload) {
      return "support_ticket";
    }
    if ("requestId" in event.payload) {
      return "privacy_request";
    }
    if ("userId" in event.payload) {
      return "user";
    }
    return "system";
  }

  private entityId(event: DomainEvent) {
    const payload = event.payload as Record<string, unknown>;
    return String(
      payload["orderId"] ??
        payload["paymentId"] ??
        payload["ticketId"] ??
        payload["requestId"] ??
        payload["userId"] ??
        ""
    );
  }

  private reason(event: DomainEvent) {
    const payload = event.payload as Record<string, unknown>;
    const reason = payload["reason"];
    return typeof reason === "string" ? reason : undefined;
  }
}
