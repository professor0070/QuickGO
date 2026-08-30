import { Injectable, BadRequestException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../common/prisma.service";
import { CustomersService } from "../customers/customers.service";
import { WalletService } from "../wallet/wallet.service";

@Injectable()
export class OdysseyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly customers: CustomersService,
    private readonly walletService: WalletService
  ) {}

  calculateLevel(points: number): { level: number; name: string } {
    if (points >= 600) return { level: 6, name: "VIP" };
    if (points >= 350) return { level: 5, name: "LOYAL" };
    if (points >= 200) return { level: 4, name: "REGULAR" };
    if (points >= 90) return { level: 3, name: "ACHIEVER" };
    if (points >= 40) return { level: 2, name: "EXPLORER" };
    return { level: 1, name: "STARTER" };
  }

  async getOrCreateProfile(customerId: string, tx?: any) {
    const prismaClient = tx || this.prisma;
    return prismaClient.odysseyProfile.upsert({
      where: { customerId },
      update: {},
      create: { customerId, points: 0, level: 1, streak: 0, cycleCount: 0 }
    });
  }

  async getOdysseySummary(userId: string) {
    const customer = await this.customers.getOrCreateCustomer(userId);
    const profile = await this.getOrCreateProfile(customer.id);

    // Get unlocked and locked rewards
    const rewards = await this.prisma.reward.findMany({
      where: { customerId: customer.id },
      orderBy: { createdAt: "desc" }
    });

    const totalOrders = await this.prisma.order.count({
      where: { customerId: customer.id, status: "COMPLETED" }
    });

    return {
      profile,
      totalOrders,
      rewards,
      levelInfo: this.calculateLevel(profile.points)
    };
  }

  async handleOrderCompletion(orderId: string, customerId: string) {
    return this.prisma.$transaction(async (tx) => {
      // Idempotency: check if we already processed this order completion
      const existingEvent = await tx.odysseyEvent.findFirst({
        where: {
          type: "ORDER_COMPLETED",
          referenceId: orderId
        }
      });

      if (existingEvent) {
        return;
      }

      const profile = await this.getOrCreateProfile(customerId, tx);

      // Increment streak and cycleCount
      const newStreak = profile.streak + 1;
      const newCycleCount = profile.cycleCount + 1;

      // 3-consecutive-order streak: 2X points on every multiple of 3
      const isStreakBonus = newStreak % 3 === 0;
      const basePoints = 10;
      const pointsEarned = isStreakBonus ? basePoints * 2 : basePoints;

      const newPoints = profile.points + pointsEarned;
      const newLevelInfo = this.calculateLevel(newPoints);

      // Update OdysseyProfile
      await tx.odysseyProfile.update({
        where: { id: profile.id },
        data: {
          points: newPoints,
          level: newLevelInfo.level,
          streak: newStreak,
          cycleCount: newCycleCount
        }
      });

      // Create OdysseyEvent
      await tx.odysseyEvent.create({
        data: {
          profileId: profile.id,
          type: "ORDER_COMPLETED",
          pointsChange: pointsEarned,
          referenceId: orderId
        }
      });

      // Handle Milestone Reward Creation
      if (newCycleCount === 5) {
        // Milestone 5 reached: 50 GO Coins scratch reward
        await tx.reward.create({
          data: {
            customerId,
            type: "MILESTONE_REWARD",
            rewardType: "COINS",
            rewardValue: 50.0,
            status: "AVAILABLE",
            metadata: { milestone: 5, cycleCount: newCycleCount }
          }
        });
      } else if (newCycleCount === 10) {
        // Milestone 10 reached: ₹20 Cashback scratch reward
        await tx.reward.create({
          data: {
            customerId,
            type: "MILESTONE_REWARD",
            rewardType: "CASHBACK",
            rewardValue: 20.0,
            status: "AVAILABLE",
            metadata: { milestone: 10, cycleCount: newCycleCount }
          }
        });

        // Reset cycleCount and streak back to 0 so next starts at 1
        await tx.odysseyProfile.update({
          where: { id: profile.id },
          data: { cycleCount: 0, streak: 0 }
        });
      }
    });
  }

  async handleOrderCancellation(orderId: string, customerId: string) {
    return this.prisma.$transaction(async (tx) => {
      // Idempotency: check if we already processed this order cancellation
      const existingEvent = await tx.odysseyEvent.findFirst({
        where: {
          type: "ORDER_CANCELLED",
          referenceId: orderId
        }
      });

      if (existingEvent) {
        return;
      }

      const profile = await this.getOrCreateProfile(customerId, tx);

      // Cancellation Breaks streak
      const newStreak = 0;

      // Apply point deduction penalty (-10 points)
      const penalty = 10;
      const newPoints = Math.max(0, profile.points - penalty);
      const newLevelInfo = this.calculateLevel(newPoints);

      await tx.odysseyProfile.update({
        where: { id: profile.id },
        data: {
          points: newPoints,
          level: newLevelInfo.level,
          streak: newStreak
        }
      });

      // Create OdysseyEvent
      await tx.odysseyEvent.create({
        data: {
          profileId: profile.id,
          type: "ORDER_CANCELLED",
          pointsChange: -penalty,
          referenceId: orderId
        }
      });
    });
  }

  async revealReward(rewardId: string, userId: string) {
    const customer = await this.customers.getOrCreateCustomer(userId);
    const reward = await this.prisma.reward.findFirst({
      where: { id: rewardId, customerId: customer.id }
    });

    if (!reward) {
      throw new NotFoundException("Reward not found");
    }

    if (reward.status !== "AVAILABLE" && reward.status !== "LOCKED") {
      return reward; // Already revealed or claimed
    }

    return this.prisma.reward.update({
      where: { id: rewardId },
      data: { status: "CLAIMABLE" }
    });
  }

  async claimReward(rewardId: string, userId: string) {
    const customer = await this.customers.getOrCreateCustomer(userId);

    return this.prisma.$transaction(async (tx) => {
      const reward = await tx.reward.findFirst({
        where: { id: rewardId, customerId: customer.id }
      });

      if (!reward) {
        throw new NotFoundException("Reward not found");
      }

      if (reward.status === "CLAIMED") {
        return { success: true, message: "Reward already claimed", reward };
      }

      if (reward.status !== "CLAIMABLE") {
        throw new BadRequestException("Reward is not yet claimable. Reveal it first.");
      }

      // Mark reward claimed
      const updatedReward = await tx.reward.update({
        where: { id: rewardId },
        data: {
          status: "CLAIMED",
          claimedAt: new Date()
        }
      });

      // Create reward claim record
      await tx.rewardClaim.create({
        data: {
          rewardId,
          customerId: customer.id,
          amount: reward.rewardValue
        }
      });

      // Credit Wallet
      const wallet = await this.walletService.getOrCreateWallet(customer.id, tx);

      if (reward.rewardType === "COINS") {
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 50);

        await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            type: "GO_COINS_CREDIT",
            amount: reward.rewardValue,
            currency: "COINS",
            referenceId: reward.id,
            description: `Milestone Reward: Unlocked ${reward.rewardValue} GO Coins`,
            expiryAt: expiryDate
          }
        });

        await tx.wallet.update({
          where: { id: wallet.id },
          data: {
            coinsBalance: {
              increment: Math.round(Number(reward.rewardValue))
            }
          }
        });
      } else if (reward.rewardType === "CASHBACK") {
        await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            type: "CASHBACK_CREDIT",
            amount: reward.rewardValue,
            currency: "CASHBACK",
            referenceId: reward.id,
            description: `Milestone Reward: Unlocked ₹${Number(reward.rewardValue).toFixed(2)} Cashback`
          }
        });

        await tx.wallet.update({
          where: { id: wallet.id },
          data: {
            cashbackBalance: {
              increment: reward.rewardValue
            }
          }
        });
      }

      return {
        success: true,
        message: "Reward claimed and credited successfully!",
        reward: updatedReward
      };
    });
  }
}
