import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaService } from "../common/prisma.service";
import {
  DomainEventBus,
  EventHandlerRegistration
} from "../internal-events/domain-event-bus.service";

@Injectable()
export class OrderSlaEventHandler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OrderSlaEventHandler.name);
  private readonly registrations: EventHandlerRegistration[] = [];

  constructor(
    private readonly eventBus: DomainEventBus,
    private readonly prisma: PrismaService
  ) {}

  onModuleInit() {
    this.registrations.push(
      this.eventBus.on("order.placed", async (event) => {
        this.logger.log(`sla_watch_started order=${event.payload.orderId}`);
        try {
          await this.prisma.slaEvent.create({
            data: {
              orderId: event.payload.orderId,
              type: "VENDOR_ACCEPTANCE_WATCH",
              breached: false,
              metadata: { eventId: event.id }
            }
          });
        } catch (err) {
          this.logger.error("Failed to create SlaEvent", err);
        }
      }),
      this.eventBus.on("vendor.order_accepted", async (event) => {
        this.logger.log(`sla_vendor_response_recorded order=${event.payload.orderId}`);
        try {
          await this.prisma.slaEvent.create({
            data: {
              orderId: event.payload.orderId,
              type: "VENDOR_ACCEPTED",
              breached: false,
              metadata: { eventId: event.id }
            }
          });
        } catch (err) {
          this.logger.error("Failed to create SlaEvent", err);
        }
      }),
      this.eventBus.on("vendor.order_ready_for_pickup", async (event) => {
        this.logger.log(`sla_pickup_watch_started order=${event.payload.orderId}`);
        try {
          await this.prisma.slaEvent.create({
            data: {
              orderId: event.payload.orderId,
              type: "RIDER_PICKUP_WATCH",
              breached: false,
              metadata: { eventId: event.id }
            }
          });
        } catch (err) {
          this.logger.error("Failed to create SlaEvent", err);
        }
      }),
      this.eventBus.on("delivery.delivered", async (event) => {
        this.logger.log(`sla_watch_completed order=${event.payload.orderId}`);
        try {
          await this.prisma.slaEvent.create({
            data: {
              orderId: event.payload.orderId,
              type: "DELIVERED",
              breached: false,
              metadata: { eventId: event.id }
            }
          });
        } catch (err) {
          this.logger.error("Failed to create SlaEvent", err);
        }
      }),
      this.eventBus.on("order.cancelled", async (event) => {
        this.logger.log(`sla_watch_closed order=${event.payload.orderId}`);
        try {
          await this.prisma.slaEvent.create({
            data: {
              orderId: event.payload.orderId,
              type: "CANCELLED",
              breached: false,
              metadata: { eventId: event.id }
            }
          });
        } catch (err) {
          this.logger.error("Failed to create SlaEvent", err);
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

