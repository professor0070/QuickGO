import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../common/prisma.service";
import { FcmProvider } from "./fcm.provider";

@Injectable()
export class NotificationsService {
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
      return { count: 0 };
    }

    const created = await this.prisma.notification.createMany({
      data: userIds.map((userId) => ({
        userId,
        title: input.title,
        body: input.body,
        data: input.data
      }))
    });

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
      if (uniqueTokens.length > 0) {
        this.fcm.sendToDevices(
          uniqueTokens,
          input.title,
          input.body,
          input.data ? (input.data as Record<string, string>) : undefined
        ).catch(() => {});
      }
    } catch (e) {
      // Fail silently to prevent interrupting transaction
    }

    return created;
  }
}
