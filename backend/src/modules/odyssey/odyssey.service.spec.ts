import { BadRequestException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { PrismaService } from "../common/prisma.service";
import { CustomersService } from "../customers/customers.service";
import { WalletService } from "../wallet/wallet.service";
import { OdysseyService } from "./odyssey.service";

describe("OdysseyService", () => {
  let service: OdysseyService;
  let prisma: PrismaService;

  const mockPrisma: any = {
    odysseyProfile: {
      upsert: jest.fn(),
      update: jest.fn()
    },
    odysseyEvent: {
      findFirst: jest.fn(),
      create: jest.fn()
    },
    reward: {
      findFirst: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn()
    },
    order: {
      count: jest.fn()
    },
    $transaction: jest.fn()
  };
  mockPrisma.$transaction.mockImplementation((cb: any) => cb(mockPrisma));

  const mockCustomers = {
    getOrCreateCustomer: jest.fn()
  };

  const mockWalletService = {
    getOrCreateWallet: jest.fn()
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OdysseyService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: CustomersService, useValue: mockCustomers },
        { provide: WalletService, useValue: mockWalletService }
      ]
    }).compile();

    service = module.get<OdysseyService>(OdysseyService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("calculateLevel", () => {
    it("should calculate starter level correctly", () => {
      const res = service.calculateLevel(30);
      expect(res.level).toBe(1);
      expect(res.name).toBe("STARTER");
    });

    it("should calculate VIP level correctly", () => {
      const res = service.calculateLevel(600);
      expect(res.level).toBe(6);
      expect(res.name).toBe("VIP");
    });
  });

  describe("handleOrderCompletion", () => {
    it("should process base points and increment streak", async () => {
      mockPrisma.odysseyEvent.findFirst.mockResolvedValue(null);
      mockPrisma.odysseyProfile.upsert.mockResolvedValue({
        id: "profile-1",
        points: 0,
        streak: 0,
        cycleCount: 0
      });

      await service.handleOrderCompletion("order-1", "cust-1");

      expect(mockPrisma.odysseyProfile.update).toHaveBeenCalledWith({
        where: { id: "profile-1" },
        data: {
          points: 10,
          level: 1,
          streak: 1,
          cycleCount: 1
        }
      });
    });

    it("should give 2X bonus on streak of 3", async () => {
      mockPrisma.odysseyEvent.findFirst.mockResolvedValue(null);
      mockPrisma.odysseyProfile.upsert.mockResolvedValue({
        id: "profile-1",
        points: 20,
        streak: 2,
        cycleCount: 2
      });

      await service.handleOrderCompletion("order-3", "cust-1");

      expect(mockPrisma.odysseyProfile.update).toHaveBeenCalledWith({
        where: { id: "profile-1" },
        data: {
          points: 40, // 20 + 20 (2X points)
          level: 2,
          streak: 3,
          cycleCount: 3
        }
      });
    });

    it("should reset streak and cycleCount to 0 when Milestone 10 is reached", async () => {
      mockPrisma.odysseyEvent.findFirst.mockResolvedValue(null);
      mockPrisma.odysseyProfile.upsert.mockResolvedValue({
        id: "profile-1",
        points: 80,
        streak: 9,
        cycleCount: 9
      });

      await service.handleOrderCompletion("order-10", "cust-1");

      expect(mockPrisma.odysseyProfile.update).toHaveBeenCalledWith({
        where: { id: "profile-1" },
        data: {
          cycleCount: 0,
          streak: 0
        }
      });
    });
  });
});
