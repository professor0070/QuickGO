import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import {
  DomainEventBus,
  EventHandlerRegistration
} from "../internal-events/domain-event-bus.service";
import { DomainEvent, DomainEventName } from "../internal-events/domain-event.types";
import { PrismaService } from "../common/prisma.service";
import { NotificationsService } from "./notifications.service";

const notificationEvents: DomainEventName[] = [
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
  "support.ticket_created"
];

@Injectable()
export class NotificationEventHandler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationEventHandler.name);
  private readonly registrations: EventHandlerRegistration[] = [];

  constructor(
    private readonly eventBus: DomainEventBus,
    private readonly notifications: NotificationsService,
    private readonly prisma: PrismaService
  ) {}

  onModuleInit() {
    for (const eventName of notificationEvents) {
      this.registrations.push(
        this.eventBus.on(eventName, async (event) => {
          const message = await this.messageForEvent(event);
          if (!message) {
            this.logger.log(`notification_skipped:${event.name} event=${event.id}`);
            return;
          }

          await this.notifications.createForUsers({
            userIds: message.userIds,
            title: message.title,
            body: message.body,
            data: {
              eventId: event.id,
              eventName: event.name,
              payload: event.payload
            }
          });
          this.logger.log(`notification_recorded:${event.name} event=${event.id}`);
        })
      );
    }
  }

  onModuleDestroy() {
    for (const registration of this.registrations) {
      registration.unsubscribe();
    }
  }

  private async messageForEvent(event: DomainEvent): Promise<
    | {
        userIds: string[];
        title: string;
        body: string;
      }
    | undefined
  > {
    const payload = event.payload as Record<string, unknown>;
    if (typeof payload["orderId"] === "string") {
      const orderId = payload["orderId"];
      const audience = await this.orderAudience(orderId);
      switch (event.name) {
        case "order.placed":
          return {
            userIds: [...audience.vendorUserIds, ...audience.adminUserIds],
            title: "New order placed",
            body: `Order ${String(payload["orderNumber"] ?? orderId)} needs vendor action`
          };
        case "order.cancelled":
          return {
            userIds: [
              ...audience.customerUserIds,
              ...audience.vendorUserIds,
              ...audience.riderUserIds,
              ...audience.adminUserIds
            ],
            title: "Order cancelled",
            body: String(payload["reason"] ?? "Order cancelled")
          };
        case "vendor.order_accepted":
          return {
            userIds: [...audience.customerUserIds, ...audience.adminUserIds],
            title: "Order accepted",
            body: "The vendor accepted the order"
          };
        case "vendor.order_rejected":
          return {
            userIds: [...audience.customerUserIds, ...audience.adminUserIds],
            title: "Order rejected",
            body: String(payload["reason"] ?? "Vendor rejected the order")
          };
        case "vendor.order_preparing":
          return {
            userIds: audience.customerUserIds,
            title: "Order is being prepared",
            body: "The vendor started preparing or packing your order"
          };
        case "vendor.order_ready_for_pickup":
          return {
            userIds: audience.adminUserIds,
            title: "Order ready for pickup",
            body: "Assign or confirm a rider for pickup"
          };
        case "delivery.rider_assigned":
        case "delivery.rider_reassigned":
          return {
            userIds: [...audience.riderUserIds, ...audience.adminUserIds],
            title: "Rider assigned",
            body: "A rider has been assigned to the order"
          };
        case "delivery.picked_up":
          return {
            userIds: [...audience.customerUserIds, ...audience.adminUserIds],
            title: "Order picked up",
            body: "Your order has been picked up"
          };
        case "delivery.delivered":
          return {
            userIds: [...audience.customerUserIds, ...audience.adminUserIds],
            title: "Order delivered",
            body: "Delivery was marked completed"
          };
        case "payment.collected":
          return {
            userIds: [...audience.customerUserIds, ...audience.adminUserIds],
            title: "Payment collected",
            body: `Payment collected: ${String(payload["amount"] ?? "")}`
          };
      }
    }

    if (event.name === "support.ticket_created") {
      return {
        userIds: await this.adminUserIds(),
        title: "Support ticket created",
        body: String(payload["subject"] ?? "A support issue needs review")
      };
    }

    return undefined;
  }

  private async orderAudience(orderId: string) {
    const [order, adminUserIds] = await Promise.all([
      this.prisma.order.findUnique({
        where: { id: orderId },
        include: {
          customer: { include: { user: true } },
          vendor: {
            include: {
              staff: {
                where: { status: "ACTIVE" },
                include: { user: true }
              }
            }
          }
        }
      }),
      this.adminUserIds()
    ]);

    const riderUserIds = order?.riderId
      ? await this.prisma.rider
          .findUnique({ where: { id: order.riderId }, select: { userId: true } })
          .then((rider) => (rider ? [rider.userId] : []))
      : [];

    return {
      customerUserIds: order ? [order.customer.userId] : [],
      vendorUserIds: order?.vendor.staff.map((staff) => staff.userId) ?? [],
      riderUserIds,
      adminUserIds
    };
  }

  private async adminUserIds() {
    const roles = await this.prisma.userRole.findMany({
      where: { role: { code: { in: ["ADMIN", "SUPER_ADMIN"] } } },
      select: { userId: true }
    });
    return roles.map((role) => role.userId);
  }
}
