import { Module } from "@nestjs/common";
import { VendorsController } from "./vendors.controller";
import { VendorsService } from "./vendors.service";
import { UploadsModule } from "../uploads/uploads.module";
import { InternalEventsModule } from "../internal-events/internal-events.module";

@Module({
  imports: [UploadsModule, InternalEventsModule],
  controllers: [VendorsController],
  providers: [VendorsService]
})
export class VendorsModule {}
