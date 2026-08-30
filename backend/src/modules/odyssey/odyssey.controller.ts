import { Controller, Get, Param, Post } from "@nestjs/common";
import { CurrentUser, RequestUser } from "../../common/auth/current-user.decorator";
import { Roles } from "../../common/auth/roles.decorator";
import { OdysseyService } from "./odyssey.service";

@Controller("odyssey")
@Roles("CUSTOMER")
export class OdysseyController {
  constructor(private readonly odysseyService: OdysseyService) {}

  @Get()
  async getSummary(@CurrentUser() user: RequestUser) {
    const data = await this.odysseyService.getOdysseySummary(user.id);
    return {
      data,
      message: "Odyssey details retrieved successfully"
    };
  }

  @Post("rewards/:rewardId/reveal")
  async reveal(@CurrentUser() user: RequestUser, @Param("rewardId") rewardId: string) {
    const reward = await this.odysseyService.revealReward(rewardId, user.id);
    return {
      data: reward,
      message: "Reward revealed successfully"
    };
  }

  @Post("rewards/:rewardId/claim")
  async claim(@CurrentUser() user: RequestUser, @Param("rewardId") rewardId: string) {
    const result = await this.odysseyService.claimReward(rewardId, user.id);
    return {
      data: result,
      message: result.message
    };
  }
}
