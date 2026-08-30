import { Injectable, BadRequestException, NotFoundException } from "@nestjs/common";
import { WalletTransaction } from "@prisma/client";
import { PrismaService } from "../common/prisma.service";
import { CustomersService } from "../customers/customers.service";

@Injectable()
export class WalletService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly customers: CustomersService
  ) {}

  async getOrCreateWallet(customerId: string, tx?: any) {
    const prismaClient = tx || this.prisma;
    return prismaClient.wallet.upsert({
      where: { customerId },
      update: {},
      create: { customerId, coinsBalance: 0, cashbackBalance: 0.0 }
    });
  }

  async getWalletDetails(userId: string) {
    const customer = await this.customers.getOrCreateCustomer(userId);
    const wallet = await this.getOrCreateWallet(customer.id);

    // Process expiries inside a transaction
    await this.prisma.$transaction(async (tx) => {
      await this.processExpiries(wallet.id, tx);
    });

    const updatedWallet = await this.prisma.wallet.findUnique({
      where: { id: wallet.id },
      include: {
        transactions: {
          orderBy: { createdAt: "desc" },
          take: 50
        }
      }
    });

    return updatedWallet;
  }

  async checkWelcomeRewardEligibility(userId: string) {
    const customer = await this.customers.getOrCreateCustomer(userId);

    // Check if user has already claimed the initial welcome reward
    const existingClaim = await this.prisma.reward.findFirst({
      where: {
        customerId: customer.id,
        type: "INITIAL_REWARD"
      }
    });

    if (existingClaim) {
      return { eligible: false, reason: "Welcome reward already claimed" };
    }

    // Check if the user has already placed orders
    const orderCount = await this.prisma.order.count({
      where: { customerId: customer.id }
    });

    if (orderCount > 0) {
      return { eligible: false, reason: "Claim must occur before placing any order" };
    }

    return { eligible: true };
  }

  async claimWelcomeReward(userId: string) {
    const customer = await this.customers.getOrCreateCustomer(userId);
    const eligibility = await this.checkWelcomeRewardEligibility(userId);

    if (!eligibility.eligible) {
      throw new BadRequestException(eligibility.reason);
    }

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 50); // 50 days expiry

    return this.prisma.$transaction(async (tx) => {
      const wallet = await this.getOrCreateWallet(customer.id, tx);

      // Create Reward record
      const reward = await tx.reward.create({
        data: {
          customerId: customer.id,
          type: "INITIAL_REWARD",
          rewardType: "COINS",
          rewardValue: 50.0,
          status: "CLAIMED",
          claimedAt: new Date(),
          expiryAt: expiryDate
        }
      });

      // Create credit transaction
      const transaction = await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: "GO_COINS_CREDIT",
          amount: 50.0,
          currency: "COINS",
          referenceId: reward.id,
          description: "Welcome Reward: 50 GO Coins claimed",
          expiryAt: expiryDate
        }
      });

      // Update wallet balance
      await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          coinsBalance: {
            increment: 50
          }
        }
      });

      return {
        success: true,
        message: "Welcome reward of 50 GO Coins credited successfully!",
        reward,
        transaction
      };
    });
  }

  async processExpiries(walletId: string, tx: any) {
    const now = new Date();

    const allTx = await tx.walletTransaction.findMany({
      where: { walletId },
      orderBy: { createdAt: "asc" }
    });

    const credits = allTx.filter((t: WalletTransaction) => t.type === "GO_COINS_CREDIT");
    const debits = allTx.filter((t: WalletTransaction) => t.type === "GO_COINS_DEBIT");
    const expiries = allTx.filter((t: WalletTransaction) => t.type === "GO_COINS_EXPIRED");

    const totalDebits = debits.reduce((sum: number, d: WalletTransaction) => sum + Number(d.amount), 0);

    for (const credit of credits) {
      if (credit.expiryAt && credit.expiryAt < now) {
        const alreadyExpired = expiries.some((e: WalletTransaction) => e.referenceId === credit.id);
        if (alreadyExpired) {
          continue;
        }

        const priorCredits = credits.filter((c: WalletTransaction) => c.createdAt < credit.createdAt);
        const totalPriorCredits = priorCredits.reduce((sum: number, c: WalletTransaction) => sum + Number(c.amount), 0);

        const spentFromThisCredit = Math.min(
          Number(credit.amount),
          Math.max(0, totalDebits - totalPriorCredits)
        );

        const remainingUnspent = Number(credit.amount) - spentFromThisCredit;
        if (remainingUnspent > 0) {
          await tx.walletTransaction.create({
            data: {
              walletId,
              type: "GO_COINS_EXPIRED",
              amount: remainingUnspent,
              currency: "COINS",
              referenceId: credit.id,
              description: `Expired ${remainingUnspent} unspent GO Coins`
            }
          });

          await tx.wallet.update({
            where: { id: walletId },
            data: {
              coinsBalance: {
                decrement: Math.round(remainingUnspent)
              }
            }
          });
        }
      }
    }
  }
}
