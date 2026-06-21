import { Module } from "@nestjs/common";
import { ServiceZonesController } from "./service-zones.controller";
import { ServiceZonesService } from "./service-zones.service";
import { ServiceabilityService } from "./serviceability.service";

@Module({
  controllers: [ServiceZonesController],
  providers: [ServiceZonesService, ServiceabilityService],
  exports: [ServiceZonesService, ServiceabilityService]
})
export class ServiceZonesModule {}
