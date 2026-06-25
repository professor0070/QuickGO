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
  "delivery.rider_arrived",
  "delivery.picked_up",
  "delivery.delivered",
  "payment.collected",
  "support.ticket_created",
  "support.ticket_updated",
  "admin.sla_breach_detected",
  "admin.reconciliation_alert_created"
];

type NotificationMessage = {
  userIds: string[];
  title: string;
  body: string;
};

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
          const messages = await this.messagesForEvent(event);
          if (!messages || messages.length === 0) {
            this.logger.log(`notification_skipped:${event.name} event=${event.id}`);
            return;
          }

          for (const message of messages) {
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
          }
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

  private async messagesForEvent(event: DomainEvent): Promise<NotificationMessage[] | undefined> {
    const payload = event.payload as Record<string, unknown>;
    const messages: NotificationMessage[] = [];

    if (typeof payload["orderId"] === "string") {
      const orderId = payload["orderId"];
      const audience = await this.orderAudience(orderId);
      const orderNum = String(payload["orderNumber"] ?? orderId);

      switch (event.name) {
        case "order.placed":
          if (audience.customerUserIds.length > 0) {
            messages.push({
              userIds: audience.customerUserIds,
              title: "Order placed successfully",
              body: `Your order #${orderNum} has been received and is awaiting vendor confirmation.`
            });
          }
          if (audience.vendorUserIds.length > 0) {
            messages.push({
              userIds: audience.vendorUserIds,
              title: "New order received",
              body: `Order #${orderNum} needs vendor acceptance.`
            });
          }
          if (audience.adminUserIds.length > 0) {
            messages.push({
              userIds: audience.adminUserIds,
              title: "New Order placed",
              body: `Order #${orderNum} has been placed.`
            });
          }
          return messages;

        case "order.cancelled":
          const reason = String(payload["reason"] ?? "Order cancelled");
          if (audience.customerUserIds.length > 0) {
            messages.push({
              userIds: audience.customerUserIds,
              title: "Order Cancelled",
              body: `Your order #${orderNum} has been cancelled. Reason: ${reason}`
            });
          }
          if (audience.vendorUserIds.length > 0) {
            messages.push({
              userIds: audience.vendorUserIds,
              title: "Order Cancelled",
              body: `Order #${orderNum} has been cancelled. Reason: ${reason}`
            });
          }
          if (audience.riderUserIds.length > 0) {
            messages.push({
              userIds: audience.riderUserIds,
              title: "Order Cancelled",
              body: `Order #${orderNum} has been cancelled. Reason: ${reason}`
            });
          }
          if (audience.adminUserIds.length > 0) {
            messages.push({
              userIds: audience.adminUserIds,
              title: "Order Cancelled",
              body: `Order #${orderNum} has been cancelled. Reason: ${reason}`
            });
          }
          return messages;

        case "vendor.order_accepted":
          if (audience.customerUserIds.length > 0) {
            messages.push({
              userIds: audience.customerUserIds,
              title: "Order Accepted",
              body: `The vendor accepted your order #${orderNum}.`
            });
          }
          if (audience.adminUserIds.length > 0) {
            messages.push({
              userIds: audience.adminUserIds,
              title: "Order Accepted",
              body: `Order #${orderNum} accepted by vendor.`
            });
          }
          return messages;

        case "vendor.order_rejected":
          const rejectReason = String(payload["reason"] ?? "Vendor rejected the order");
          if (audience.customerUserIds.length > 0) {
            messages.push({
              userIds: audience.customerUserIds,
              title: "Order Rejected",
              body: `Your order #${orderNum} was rejected by vendor. Reason: ${rejectReason}`
            });
          }
          if (audience.adminUserIds.length > 0) {
            messages.push({
              userIds: audience.adminUserIds,
              title: "Order Rejected",
              body: `Order #${orderNum} rejected by vendor. Reason: ${rejectReason}`
            });
          }
          return messages;

        case "vendor.order_preparing":
          if (audience.customerUserIds.length > 0) {
            messages.push({
              userIds: audience.customerUserIds,
              title: "Order Preparing",
              body: `The vendor started preparing/packing your order #${orderNum}.`
            });
          }
          return messages;

        case "vendor.order_ready_for_pickup":
          if (audience.adminUserIds.length > 0) {
            messages.push({
              userIds: audience.adminUserIds,
              title: "Order Ready for Pickup",
              body: `Order #${orderNum} is ready. Assign a rider.`
            });
          }
          return messages;

        case "delivery.rider_assigned":
        case "delivery.rider_reassigned":
          if (audience.customerUserIds.length > 0) {
            messages.push({
              userIds: audience.customerUserIds,
              title: "Rider Assigned",
              body: `A delivery partner has been assigned to bring your order #${orderNum}.`
            });
          }
          if (audience.riderUserIds.length > 0) {
            messages.push({
              userIds: audience.riderUserIds,
              title: "New assignment",
              body: `Order #${orderNum} has been assigned to you.`
            });
          }
          if (audience.adminUserIds.length > 0) {
            messages.push({
              userIds: audience.adminUserIds,
              title: "Rider Assigned",
              body: `Rider assigned to order #${orderNum}.`
            });
          }
          return messages;

        case "delivery.rider_arrived":
          if (audience.customerUserIds.length > 0) {
            messages.push({
              userIds: audience.customerUserIds,
              title: "Rider Arrived",
              body: `The delivery partner has arrived at the vendor store for order #${orderNum}.`
            });
          }
          if (audience.adminUserIds.length > 0) {
            messages.push({
              userIds: audience.adminUserIds,
              title: "Rider Arrived",
              body: `Rider arrived at store for order #${orderNum}.`
            });
          }
          return messages;

        case "delivery.picked_up":
          if (audience.customerUserIds.length > 0) {
            messages.push({
              userIds: audience.customerUserIds,
              title: "Order Picked Up",
              body: `The rider has picked up your order #${orderNum} and is on the way.`
            });
          }
          if (audience.adminUserIds.length > 0) {
            messages.push({
              userIds: audience.adminUserIds,
              title: "Order Picked Up",
              body: `Rider picked up order #${orderNum}.`
            });
          }
          return messages;

        case "delivery.delivered":
          if (audience.customerUserIds.length > 0) {
            messages.push({
              userIds: audience.customerUserIds,
              title: "Order Delivered",
              body: `Your order #${orderNum} has been delivered successfully.`
            });
          }
          if (audience.adminUserIds.length > 0) {
            messages.push({
              userIds: audience.adminUserIds,
              title: "Order Delivered",
              body: `Order #${orderNum} delivered.`
            });
          }
          return messages;

        case "payment.collected":
          const amount = String(payload["amount"] ?? "");
          if (audience.customerUserIds.length > 0) {
            messages.push({
              userIds: audience.customerUserIds,
              title: "Payment Collected",
              body: `Rs ${amount} payment collected for order #${orderNum}.`
            });
          }
          if (audience.adminUserIds.length > 0) {
            messages.push({
              userIds: audience.adminUserIds,
              title: "Payment Collected",
              body: `Payment of Rs ${amount} collected for order #${orderNum}.`
            });
          }
          return messages;
      }
    }

    if (event.name === "support.ticket_created") {
      messages.push({
        userIds: await this.adminUserIds(),
        title: "New support ticket",
        body: String(payload["subject"] ?? "A support issue needs review")
      });
      return messages;
    }

    if (event.name === "support.ticket_updated") {
      const ticketId = String(payload["ticketId"]);
      const status = String(payload["status"]);
      const adminNote = String(payload["adminNote"] ?? "No details provided");

      const ticket = await this.prisma.supportTicket.findUnique({
        where: { id: ticketId }
      });
      if (ticket) {
        messages.push({
          userIds: [ticket.createdBy],
          title: "Support ticket updated",
          body: `Your ticket has been updated to ${status}. Note: ${adminNote}`
        });
      }
      messages.push({
        userIds: await this.adminUserIds(),
        title: "Support Ticket updated",
        body: `Ticket #${ticketId} updated to ${status}.`
      });
      return messages;
    }

    if (event.name === "admin.sla_breach_detected") {
      messages.push({
        userIds: await this.adminUserIds(),
        title: "Critical SLA Breach Alert",
        body: String(payload["message"])
      });
      return messages;
    }

    if (event.name === "admin.reconciliation_alert_created") {
      messages.push({
        userIds: await this.adminUserIds(),
        title: "Critical Payment Mismatch Alert",
        body: String(payload["message"])
      });
      return messages;
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
