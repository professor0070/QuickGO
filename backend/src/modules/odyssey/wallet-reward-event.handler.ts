import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaService } from "../common/prisma.service";
import {
  DomainEventBus,
  EventHandlerRegistration
} from "../internal-events/domain-event-bus.service";
import { OdysseyService } from "./odyssey.service";

@Injectable()
export class WalletRewardEventHandler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WalletRewardEventHandler.name);
  private readonly registrations: EventHandlerRegistration[] = [];

  constructor(
    private readonly eventBus: DomainEventBus,
    private readonly prisma: PrismaService,
    private readonly odyssey: OdysseyService
  ) {}

  onModuleInit() {
    this.registrations.push(
      // 1. Order Delivered Event (Completed check)
      this.eventBus.on("delivery.delivered", async (event) => {
        this.logger.log(`Received delivery.delivered event for order=${event.payload.orderId}`);
        try {
          const order = await this.prisma.order.findUnique({
            where: { id: event.payload.orderId }
          });
          if (order && order.status === "COMPLETED") {
            await this.odyssey.handleOrderCompletion(order.id, order.customerId);
            this.logger.log(`Processed order completion via delivery.delivered for order=${order.id}`);
          }
        } catch (err) {
          this.logger.error("Failed to process order completion reward", err);
        }
      }),

      // 2. Payment Reconciled Event (Completed check)
      this.eventBus.on("payment.reconciled", async (event) => {
        this.logger.log(`Received payment.reconciled event for order=${event.payload.orderId}`);
        try {
          if (!event.payload.orderId) return;
          const order = await this.prisma.order.findUnique({
            where: { id: event.payload.orderId }
          });
          if (order && order.status === "COMPLETED") {
            await this.odyssey.handleOrderCompletion(order.id, order.customerId);
            this.logger.log(`Processed order completion via payment.reconciled for order=${order.id}`);
          }
        } catch (err) {
          this.logger.error("Failed to process reconciled order completion reward", err);
        }
      }),

      // 3. Order Cancelled Event (Penalty & streak break)
      this.eventBus.on("order.cancelled", async (event) => {
        this.logger.log(`Received order.cancelled event for order=${event.payload.orderId}`);
        try {
          const order = await this.prisma.order.findUnique({
            where: { id: event.payload.orderId }
          });
          if (order) {
            await this.odyssey.handleOrderCancellation(order.id, order.customerId);
            this.logger.log(`Processed cancellation penalty for order=${order.id}`);
          }
        } catch (err) {
          this.logger.error("Failed to process order cancellation penalty", err);
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
