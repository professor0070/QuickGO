import { Test, TestingModule } from "@nestjs/testing";
import { NotificationsService } from "./notifications.service";
import { PrismaService } from "../common/prisma.service";
import { FcmProvider } from "./fcm.provider";
import { NotFoundException } from "@nestjs/common";

describe("NotificationsService", () => {
  let service: NotificationsService;
  let prisma: any;
  let fcm: any;

  beforeEach(async () => {
    prisma = {
      notification: {
        findMany: jest.fn(),
        count: jest.fn(),
        updateMany: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        create: jest.fn(),
      },
      deviceSession: {
        findFirst: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
      },
      customer: {
        findUnique: jest.fn(),
      },
      customerDevice: {
        upsert: jest.fn(),
      },
      rider: {
        findUnique: jest.fn(),
      },
      riderDevice: {
        upsert: jest.fn(),
      },
    };

    fcm = {
      sendToDevices: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: prisma },
        { provide: FcmProvider, useValue: fcm },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("list", () => {
    it("should return a list of notifications for a user", async () => {
      const mockNotifications = [{ id: "n1", userId: "u1", title: "Test" }];
      prisma.notification.findMany.mockResolvedValue(mockNotifications);

      const result = await service.list("u1");
      expect(result).toEqual(mockNotifications);
      expect(prisma.notification.findMany).toHaveBeenCalledWith({
        where: { userId: "u1" },
        orderBy: { createdAt: "desc" },
        take: 50,
      });
    });
  });

  describe("unreadCount", () => {
    it("should return unread count", async () => {
      prisma.notification.count.mockResolvedValue(5);
      const count = await service.unreadCount("u1");
      expect(count).toBe(5);
      expect(prisma.notification.count).toHaveBeenCalledWith({
        where: { userId: "u1", readAt: null },
      });
    });
  });

  describe("markRead", () => {
    it("should throw NotFoundException if count is 0", async () => {
      prisma.notification.updateMany.mockResolvedValue({ count: 0 });
      await expect(service.markRead("u1", "n1")).rejects.toThrow(NotFoundException);
    });

    it("should update and return the read notification", async () => {
      prisma.notification.updateMany.mockResolvedValue({ count: 1 });
      const mockNotification = { id: "n1", readAt: new Date() };
      prisma.notification.findUniqueOrThrow.mockResolvedValue(mockNotification);

      const result = await service.markRead("u1", "n1");
      expect(result).toEqual(mockNotification);
    });
  });

  describe("registerDevice", () => {
    it("should update existing device session if found", async () => {
      prisma.deviceSession.findFirst.mockResolvedValue({ id: "ds1" });
      prisma.deviceSession.update.mockResolvedValue({});

      const result = await service.registerDevice(
        "u1",
        { fcmToken: "token1", platform: "IOS", appVersion: "1.0.0" },
        []
      );

      expect(result).toEqual({ success: true, message: "Device registered successfully" });
      expect(prisma.deviceSession.update).toHaveBeenCalled();
    });

    it("should create new device session if not found", async () => {
      prisma.deviceSession.findFirst.mockResolvedValue(null);
      prisma.deviceSession.create.mockResolvedValue({});

      await service.registerDevice(
        "u1",
        { fcmToken: "token1", platform: "ANDROID", appVersion: "1.0.0" },
        []
      );

      expect(prisma.deviceSession.create).toHaveBeenCalled();
    });

    it("should upsert customer device if user has CUSTOMER role", async () => {
      prisma.deviceSession.findFirst.mockResolvedValue({ id: "ds1" });
      prisma.deviceSession.update.mockResolvedValue({});
      prisma.customer.findUnique.mockResolvedValue({ id: "cust1" });
      prisma.customerDevice.upsert.mockResolvedValue({});

      await service.registerDevice(
        "u1",
        { fcmToken: "token1", platform: "ANDROID" },
        ["CUSTOMER"]
      );

      expect(prisma.customerDevice.upsert).toHaveBeenCalledWith({
        where: { fcmToken: "token1" },
        update: { customerId: "cust1", platform: "ANDROID", appVersion: null },
        create: { fcmToken: "token1", customerId: "cust1", platform: "ANDROID", appVersion: null },
      });
    });

    it("should upsert rider device if user has RIDER role", async () => {
      prisma.deviceSession.findFirst.mockResolvedValue({ id: "ds1" });
      prisma.deviceSession.update.mockResolvedValue({});
      prisma.rider.findUnique.mockResolvedValue({ id: "rider1" });
      prisma.riderDevice.upsert.mockResolvedValue({});

      await service.registerDevice(
        "u1",
        { fcmToken: "token1", platform: "ANDROID" },
        ["RIDER"]
      );

      expect(prisma.riderDevice.upsert).toHaveBeenCalledWith({
        where: { fcmToken: "token1" },
        update: { riderId: "rider1", platform: "ANDROID", appVersion: null },
        create: { fcmToken: "token1", riderId: "rider1", platform: "ANDROID", appVersion: null },
      });
    });
  });
});
