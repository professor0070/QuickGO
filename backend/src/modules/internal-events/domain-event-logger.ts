import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { EventHandlerRegistration } from "./domain-event-bus.service";
import { DomainEventBus } from "./domain-event-bus.service";
import { DomainEventName } from "./domain-event.types";

const loggedEvents: DomainEventName[] = [
  "order.placed",
  "order.cancelled",
  "vendor.order_accepted",
  "vendor.order_rejected",
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
export class DomainEventLogger implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DomainEventLogger.name);
  private readonly registrations: EventHandlerRegistration[] = [];

  constructor(private readonly eventBus: DomainEventBus) {}

  onModuleInit() {
    for (const eventName of loggedEvents) {
      this.registrations.push(
        this.eventBus.on(eventName, (event) => {
          this.logger.log(
            `${event.name} ${event.id} from ${event.metadata.source}`
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
}
