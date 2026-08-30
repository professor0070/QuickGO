import { Module } from "@nestjs/common";
import { RidersController } from "./riders.controller";
import { RidersService } from "./riders.service";
import { SupportModule } from "../support/support.module";
import { InternalEventsModule } from "../internal-events/internal-events.module";

@Module({
  imports: [SupportModule, InternalEventsModule],
  controllers: [RidersController],
  providers: [RidersService]
})
export class RidersModule {}
