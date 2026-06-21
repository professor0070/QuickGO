import { Module } from "@nestjs/common";
import { SupportModule } from "../support/support.module";
import { RidersController } from "./riders.controller";
import { RidersService } from "./riders.service";

@Module({
  imports: [SupportModule],
  controllers: [RidersController],
  providers: [RidersService]
})
export class RidersModule {}
