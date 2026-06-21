import { Injectable } from "@nestjs/common";
import { PrismaService } from "../common/prisma.service";
import { OrderStatus } from "../orders/order-state.machine";

const CANCELLED_STATUSES: OrderStatus[] = [
  "CUSTOMER_CANCELLED",
  "VENDOR_REJECTED",
  "ADMIN_CANCELLED",
  "CANCELLED"
];

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async validationDashboard() {
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const [
      todayOrders,
      totalOrders,
      completedOrders,
      cancelledOrders,
      acceptedOrders,
      rejectedOrders,
      activeVendors,
      approvedVendors,
      approvedRiders,
      onlineRiders,
      openSupportTickets,
      paymentAttention,
      freshProducts,
      freshProductsUpdatedToday,
      deliveredOrders,
      economics,
      customerOrderCounts,
      compliancePending
    ] = await Promise.all([
      this.prisma.order.count({ where: { createdAt: { gte: start } } }),
      this.prisma.order.count(),
      this.prisma.order.count({ where: { status: "COMPLETED" } }),
      this.prisma.order.count({ where: { status: { in: CANCELLED_STATUSES } } }),
      this.prisma.order.count({
        where: {
          status: {
            in: [
              "VENDOR_ACCEPTED",
              "PREPARING_OR_PACKING",
              "READY_FOR_PICKUP",
              "RIDER_ASSIGNED",
              "PICKED_UP",
              "DELIVERED",
              "PAYMENT_COLLECTED",
              "COMPLETED"
            ]
          }
        }
      }),
      this.prisma.order.count({
        where: { status: "VENDOR_REJECTED" }
      }),
      this.prisma.vendor.count({ where: { isOpen: true, status: "APPROVED" } }),
      this.prisma.vendor.count({ where: { status: "APPROVED" } }),
      this.prisma.rider.count({ where: { status: "APPROVED" } }),
      this.prisma.rider.count({ where: { isOnline: true, status: "APPROVED" } }),
      this.prisma.supportTicket.count({ where: { status: { in: ["OPEN", "IN_REVIEW", "IN_PROGRESS"] } } }),
      this.prisma.payment.count({
        where: {
          status: {
            in: [
              "COLLECTION_PENDING",
              "COLLECTED_UNVERIFIED",
              "SHORT_COLLECTED",
              "OVER_COLLECTED",
              "DISPUTED"
            ]
          }
        }
      }),
      this.prisma.product.count({
        where: { isApproved: true, category: { isFresh: true } }
      }),
      this.prisma.product.count({
        where: {
          isApproved: true,
          category: { isFresh: true },
          prices: { some: { isActive: true, effectiveOn: { gte: start } } }
        }
      }),
      this.prisma.order.findMany({
        where: { deliveredAt: { not: null } },
        select: { createdAt: true, deliveredAt: true }
      }),
      this.prisma.order.aggregate({
        _sum: {
          itemTotal: true,
          deliveryFee: true,
          commissionAmount: true,
          totalAmount: true
        },
        where: { status: { in: ["PAYMENT_COLLECTED", "COMPLETED"] } }
      }),
      this.prisma.order.groupBy({
        by: ["customerId"],
        _count: { _all: true }
      }),
      Promise.all([
        this.prisma.vendor.count({ where: { fssaiStatus: "FSSAI_PENDING" } }),
        this.prisma.rider.count({ where: { onboardingStatus: { in: ["PENDING", "IN_REVIEW"] } } })
      ])
    ]);

    const averageDeliveryMinutes = this.averageDeliveryMinutes(deliveredOrders);
    const repeatCustomers = customerOrderCounts.filter((item) => item._count._all > 1).length;
    const successfulOrders = completedOrders;
    const vendorDecisionOrders = acceptedOrders + rejectedOrders;
    const vendorAcceptanceRate =
      vendorDecisionOrders === 0 ? null : Number(((acceptedOrders / vendorDecisionOrders) * 100).toFixed(2));
    const cancellationRate =
      totalOrders === 0 ? null : Number(((cancelledOrders / totalOrders) * 100).toFixed(2));
    const repeatCustomerRate =
      customerOrderCounts.length === 0
        ? null
        : Number(((repeatCustomers / customerOrderCounts.length) * 100).toFixed(2));

    return {
      demand: {
        today_orders: todayOrders,
        total_orders: totalOrders,
        successful_orders: successfulOrders,
        repeat_customers: repeatCustomers,
        repeat_customer_rate_percent: repeatCustomerRate
      },
      supply: {
        active_vendors: activeVendors,
        approved_vendors: approvedVendors,
        approved_riders: approvedRiders,
        online_riders: onlineRiders,
        fresh_products: freshProducts,
        fresh_products_updated_today: freshProductsUpdatedToday
      },
      delivery: {
        average_delivery_time_minutes: averageDeliveryMinutes,
        completed_under_90_minutes:
          averageDeliveryMinutes === null ? null : averageDeliveryMinutes <= 90
      },
      operations: {
        open_support_tickets: openSupportTickets,
        payment_attention_required: paymentAttention,
        cancelled_orders: cancelledOrders,
        vendor_acceptance_rate_percent: vendorAcceptanceRate,
        cancellation_rate_percent: cancellationRate,
        vendor_or_rider_compliance_pending_count: compliancePending[0] + compliancePending[1]
      },
      unit_economics: {
        gross_order_value: Number(economics._sum.totalAmount ?? 0),
        item_total: Number(economics._sum.itemTotal ?? 0),
        delivery_fee_collected: Number(economics._sum.deliveryFee ?? 0),
        vendor_commission: Number(economics._sum.commissionAmount ?? 0),
        rider_payout_estimate: Number(economics._sum.deliveryFee ?? 0)
      },
      investor_signals: {
        one_hundred_successful_orders: successfulOrders >= 100,
        repeat_rate_30_percent: repeatCustomerRate === null ? false : repeatCustomerRate >= 30,
        vendor_acceptance_70_percent:
          vendorAcceptanceRate === null ? false : vendorAcceptanceRate >= 70,
        average_delivery_under_90_minutes:
          averageDeliveryMinutes === null ? false : averageDeliveryMinutes <= 90,
        cancellation_under_15_percent: cancellationRate === null ? false : cancellationRate < 15
      }
    };
  }

  private averageDeliveryMinutes(
    orders: Array<{ createdAt: Date; deliveredAt: Date | null }>
  ): number | null {
    const delivered = orders.filter((order): order is { createdAt: Date; deliveredAt: Date } =>
      Boolean(order.deliveredAt)
    );
    if (delivered.length === 0) {
      return null;
    }

    const totalMinutes = delivered.reduce(
      (sum, order) => sum + (order.deliveredAt.getTime() - order.createdAt.getTime()) / 60_000,
      0
    );
    return Number((totalMinutes / delivered.length).toFixed(2));
  }
}
