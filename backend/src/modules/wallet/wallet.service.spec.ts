import { BadRequestException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { PrismaService } from "../common/prisma.service";
import { CustomersService } from "../customers/customers.service";
import { WalletService } from "./wallet.service";

describe("WalletService", () => {
  let service: WalletService;
  let prisma: PrismaService;
  let customers: CustomersService;

  const mockPrisma: any = {
    wallet: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn()
    },
    reward: {
      findFirst: jest.fn(),
      create: jest.fn()
    },
    order: {
      count: jest.fn()
    },
    walletTransaction: {
      create: jest.fn(),
      findMany: jest.fn()
    },
    $transaction: jest.fn()
  };
  mockPrisma.$transaction.mockImplementation((cb: any) => cb(mockPrisma));

  const mockCustomers = {
    getOrCreateCustomer: jest.fn()
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: CustomersService, useValue: mockCustomers }
      ]
    }).compile();

    service = module.get<WalletService>(WalletService);
    prisma = module.get<PrismaService>(PrismaService);
    customers = module.get<CustomersService>(CustomersService);

    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("checkWelcomeRewardEligibility", () => {
    it("should return eligible: true when no previous rewards and no orders", async () => {
      mockCustomers.getOrCreateCustomer.mockResolvedValue({ id: "cust-1" });
      mockPrisma.reward.findFirst.mockResolvedValue(null);
      mockPrisma.order.count.mockResolvedValue(0);

      const res = await service.checkWelcomeRewardEligibility("user-1");
      expect(res).toEqual({ eligible: true });
    });

    it("should return ineligible when reward already claimed", async () => {
      mockCustomers.getOrCreateCustomer.mockResolvedValue({ id: "cust-1" });
      mockPrisma.reward.findFirst.mockResolvedValue({ id: "reward-1" });

      const res = await service.checkWelcomeRewardEligibility("user-1");
      expect(res.eligible).toBe(false);
      expect(res.reason).toContain("already claimed");
    });

    it("should return ineligible when orders exist", async () => {
      mockCustomers.getOrCreateCustomer.mockResolvedValue({ id: "cust-1" });
      mockPrisma.reward.findFirst.mockResolvedValue(null);
      mockPrisma.order.count.mockResolvedValue(1);

      const res = await service.checkWelcomeRewardEligibility("user-1");
      expect(res.eligible).toBe(false);
      expect(res.reason).toContain("before placing any order");
    });
  });

  describe("claimWelcomeReward", () => {
    it("should claim welcome reward successfully", async () => {
      mockCustomers.getOrCreateCustomer.mockResolvedValue({ id: "cust-1" });
      mockPrisma.reward.findFirst.mockResolvedValue(null);
      mockPrisma.order.count.mockResolvedValue(0);

      mockPrisma.wallet.upsert.mockResolvedValue({ id: "wallet-1" });
      mockPrisma.reward.create.mockResolvedValue({ id: "reward-1" });
      mockPrisma.walletTransaction.create.mockResolvedValue({ id: "tx-1" });

      const res = await service.claimWelcomeReward("user-1");
      expect(res.success).toBe(true);
      expect(mockPrisma.wallet.update).toHaveBeenCalled();
    });

    it("should throw BadRequestException if ineligible", async () => {
      mockCustomers.getOrCreateCustomer.mockResolvedValue({ id: "cust-1" });
      mockPrisma.reward.findFirst.mockResolvedValue({ id: "reward-1" });

      await expect(service.claimWelcomeReward("user-1")).rejects.toThrow(BadRequestException);
    });
  });
});
