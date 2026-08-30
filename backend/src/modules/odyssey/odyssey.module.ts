import { Module } from "@nestjs/common";
import { CustomersModule } from "../customers/customers.module";
import { WalletModule } from "../wallet/wallet.module";
import { InternalEventsModule } from "../internal-events/internal-events.module";
import { OdysseyController } from "./odyssey.controller";
import { OdysseyService } from "./odyssey.service";
import { WalletRewardEventHandler } from "./wallet-reward-event.handler";

@Module({
  imports: [CustomersModule, WalletModule, InternalEventsModule],
  controllers: [OdysseyController],
  providers: [OdysseyService, WalletRewardEventHandler],
  exports: [OdysseyService]
})
export class OdysseyModule {}
