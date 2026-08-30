import { Controller, Get, Post } from "@nestjs/common";
import { CurrentUser, RequestUser } from "../../common/auth/current-user.decorator";
import { Roles } from "../../common/auth/roles.decorator";
import { WalletService } from "./wallet.service";

@Controller("wallet")
@Roles("CUSTOMER")
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get()
  async getWallet(@CurrentUser() user: RequestUser) {
    const details = await this.walletService.getWalletDetails(user.id);
    return {
      data: details,
      message: "Wallet details retrieved successfully"
    };
  }

  @Get("welcome-eligibility")
  async checkWelcomeEligibility(@CurrentUser() user: RequestUser) {
    const eligibility = await this.walletService.checkWelcomeRewardEligibility(user.id);
    return {
      data: eligibility,
      message: "Welcome eligibility checked successfully"
    };
  }

  @Post("go-coins/claim")
  async claimWelcomeReward(@CurrentUser() user: RequestUser) {
    const result = await this.walletService.claimWelcomeReward(user.id);
    return {
      data: result,
      message: result.message
    };
  }
}
