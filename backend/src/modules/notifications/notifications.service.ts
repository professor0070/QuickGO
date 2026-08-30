import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../common/prisma.service";
import { FcmProvider, PushDispatchResult } from "./fcm.provider";

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly fcm: FcmProvider
  ) {}

  list(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50
    });
  }

  unreadCount(userId: string) {
    return this.prisma.notification.count({
      where: { userId, readAt: null }
    });
  }

  async markRead(userId: string, notificationId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { readAt: new Date() }
    });
    if (result.count === 0) {
      throw new NotFoundException("Notification not found");
    }

    return this.prisma.notification.findUniqueOrThrow({
      where: { id: notificationId }
    });
  }

  async createForUsers(input: {
    userIds: string[];
    title: string;
    body: string;
    data?: Prisma.InputJsonValue;
  }) {
    const userIds = [...new Set(input.userIds)].filter(Boolean);
    if (userIds.length === 0) {
      return { count: 0, deliveryStatus: "SKIPPED", attemptedTokens: 0 };
    }

    const notifications = await Promise.all(
      userIds.map((userId) =>
        this.prisma.notification.create({
          data: {
            userId,
            title: input.title,
            body: input.body,
            data: input.data,
            channel: "IN_APP_PUSH",
            deliveryStatus: "PENDING"
          }
        })
      )
    );
    const notificationIds = notifications.map((notification) => notification.id);

    try {
      const [customers, riders] = await Promise.all([
        this.prisma.customer.findMany({
          where: { userId: { in: userIds } },
          select: { id: true }
        }),
        this.prisma.rider.findMany({
          where: { userId: { in: userIds } },
          select: { id: true }
        })
      ]);
      const customerIds = customers.map((c) => c.id);
      const riderIds = riders.map((r) => r.id);

      const [sessions, customerDevices, riderDevices] = await Promise.all([
        this.prisma.deviceSession.findMany({
          where: { userId: { in: userIds }, fcmToken: { not: null } },
          select: { fcmToken: true }
        }),
        this.prisma.customerDevice.findMany({
          where: { customerId: { in: customerIds } },
          select: { fcmToken: true }
        }),
        this.prisma.riderDevice.findMany({
          where: { riderId: { in: riderIds } },
          select: { fcmToken: true }
        })
      ]);

      const tokens = [
        ...sessions.map((s) => s.fcmToken),
        ...customerDevices.map((d) => d.fcmToken),
        ...riderDevices.map((d) => d.fcmToken)
      ].filter((t): t is string => !!t);

      const uniqueTokens = [...new Set(tokens)];
      if (uniqueTokens.length === 0) {
        const dispatch = {
          attemptedTokens: 0,
          successCount: 0,
          failureCount: 0,
          simulated: false
        };
        await this.recordDelivery(notificationIds, "NO_DEVICE", dispatch);
        return { count: notifications.length, deliveryStatus: "NO_DEVICE", attemptedTokens: 0 };
      }

      const dispatch = await this.fcm.sendToDevices(
        uniqueTokens,
        input.title,
        input.body,
        this.pushData(input.data)
      );
      const deliveryStatus = this.deliveryStatus(dispatch);
      await this.recordDelivery(notificationIds, deliveryStatus, dispatch, dispatch.error);

      return {
        count: notifications.length,
        deliveryStatus,
        attemptedTokens: dispatch.attemptedTokens
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown notification dispatch error";
      this.logger.warn(`Notification dispatch failed after rows were recorded: ${message}`);
      await this.recordDelivery(
        notificationIds,
        "FAILED",
        {
          attemptedTokens: 0,
          successCount: 0,
          failureCount: 0,
          simulated: false,
          error: message
        },
        message
      );
    }

    return { count: notifications.length, deliveryStatus: "FAILED", attemptedTokens: 0 };
  }

  private async recordDelivery(
    notificationIds: string[],
    deliveryStatus: string,
    dispatch: PushDispatchResult,
    deliveryError?: string
  ) {
    if (notificationIds.length === 0) {
      return;
    }

    await this.prisma.notification.updateMany({
      where: { id: { in: notificationIds } },
      data: {
        deliveryStatus,
        deliveryAttempts: 1,
        deliveryError,
        deliveryMetadata: dispatch as unknown as Prisma.InputJsonValue,
        sentAt: deliveryStatus === "NO_DEVICE" || deliveryStatus === "FAILED" ? null : new Date()
      }
    });
  }

  private deliveryStatus(dispatch: PushDispatchResult) {
    if (dispatch.simulated) {
      return "SIMULATED";
    }
    if (dispatch.failureCount > 0 && dispatch.successCount > 0) {
      return "PARTIAL";
    }
    if (dispatch.failureCount > 0) {
      return "FAILED";
    }
    return "SENT";
  }

  private pushData(data: Prisma.InputJsonValue | undefined): Record<string, unknown> | undefined {
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      return undefined;
    }

    return data as Record<string, unknown>;
  }

  async registerDevice(
    userId: string,
    dto: { fcmToken: string; platform?: string; appVersion?: string },
    roles: string[]
  ) {
    const { fcmToken, platform, appVersion } = dto;

    const existingSession = await this.prisma.deviceSession.findFirst({
      where: { userId, fcmToken }
    });
    if (existingSession) {
      await this.prisma.deviceSession.update({
        where: { id: existingSession.id },
        data: { lastSeenAt: new Date(), platform: platform ?? "ANDROID", appVersion: appVersion ?? null }
      });
    } else {
      await this.prisma.deviceSession.create({
        data: {
          userId,
          fcmToken,
          platform: platform ?? "ANDROID",
          appVersion: appVersion ?? null
        }
      });
    }

    if (roles.includes("CUSTOMER")) {
      const customer = await this.prisma.customer.findUnique({
        where: { userId }
      });
      if (customer) {
        await this.prisma.customerDevice.upsert({
          where: { fcmToken },
          update: {
            customerId: customer.id,
            platform: platform ?? "ANDROID",
            appVersion: appVersion ?? null
          },
          create: {
            fcmToken,
            customerId: customer.id,
            platform: platform ?? "ANDROID",
            appVersion: appVersion ?? null
          }
         });
      }
    }

    if (roles.includes("RIDER")) {
      const rider = await this.prisma.rider.findUnique({
        where: { userId }
      });
      if (rider) {
        await this.prisma.riderDevice.upsert({
          where: { fcmToken },
          update: {
            riderId: rider.id,
            platform: platform ?? "ANDROID",
            appVersion: appVersion ?? null
          },
          create: {
            fcmToken,
            riderId: rider.id,
            platform: platform ?? "ANDROID",
            appVersion: appVersion ?? null
          }
        });
      }
    }

    return { success: true, message: "Device registered successfully" };
  }

  async sendMockNotification(title: string, body: string) {
    const sessions = await this.prisma.deviceSession.findMany({
      where: { fcmToken: { not: null } },
      select: { fcmToken: true }
    });

    const tokens = sessions.map(s => s.fcmToken).filter((t): t is string => !!t);
    const uniqueTokens = [...new Set(tokens)];

    if (uniqueTokens.length === 0) {
      return { success: false, message: "No devices registered with FCM tokens in database." };
    }

    this.logger.log(`Sending mock FCM notification to ${uniqueTokens.length} devices...`);
    const dispatch = await this.fcm.sendToDevices(
      uniqueTokens,
      title,
      body,
      { type: "mock_test", sentAt: new Date().toISOString() }
    );

    return {
      success: true,
      message: `Mock notification dispatch complete.`,
      dispatch
    };
  }

  async sendVendorOrderNotification(orderNumber: string, vendorId?: string) {
    let vendorStaff;
    if (vendorId) {
      vendorStaff = await this.prisma.vendorStaff.findMany({
        where: { vendorId, status: "ACTIVE" },
        select: { userId: true }
      });
    } else {
      vendorStaff = await this.prisma.vendorStaff.findMany({
        where: { status: "ACTIVE" },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { userId: true }
      });
    }

    const userIds = vendorStaff.map(s => s.userId).filter(Boolean);
    if (userIds.length === 0) {
      const sessions = await this.prisma.deviceSession.findMany({
        select: { userId: true }
      });
      userIds.push(...sessions.map(s => s.userId));
    }

    const uniqueUserIds = [...new Set(userIds)];
    if (uniqueUserIds.length === 0) {
      return { success: false, message: "No active users found to send the notification to." };
    }

    const result = await this.createForUsers({
      userIds: uniqueUserIds,
      title: "New order received",
      body: `Order #${orderNumber} needs vendor acceptance.`,
      data: {
        eventName: "order.placed",
        payload: {
          orderNumber,
          orderId: "mock-order-id-" + Date.now()
        }
      }
    });

    return {
      success: true,
      message: `Sent 'New order received' notification to ${uniqueUserIds.length} users.`,
      result
    };
  }
}
