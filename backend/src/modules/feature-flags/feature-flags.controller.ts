import { Controller, Get } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Public } from "../../common/auth/public.decorator";

@Controller("system/feature-flags")
export class FeatureFlagsController {
  constructor(private readonly config: ConfigService) {}

  @Public()
  @Get()
  flags() {
    return {
      MVP_MANUAL_DISPATCH: this.config.getOrThrow<boolean>("MVP_MANUAL_DISPATCH"),
      ORDER_CREATION_ENABLED: this.config.getOrThrow<boolean>("ORDER_CREATION_ENABLED"),
      COD_ON_DELIVERY_ENABLED: this.config.getOrThrow<boolean>("COD_ON_DELIVERY_ENABLED"),
      UPI_ON_DELIVERY_ENABLED: this.config.getOrThrow<boolean>("UPI_ON_DELIVERY_ENABLED"),
      SUPPORT_INTAKE_ENABLED: this.config.getOrThrow<boolean>("SUPPORT_INTAKE_ENABLED"),
      SERVICE_ZONE_LOCK_ENABLED: this.config.getOrThrow<boolean>("SERVICE_ZONE_LOCK_ENABLED"),
      MAINTENANCE_MODE: this.config.getOrThrow<boolean>("MAINTENANCE_MODE"),
      VENDOR_ORDER_ACCEPTANCE_ENABLED: this.config.getOrThrow<boolean>(
        "VENDOR_ORDER_ACCEPTANCE_ENABLED"
      ),
      RIDER_ASSIGNMENT_ENABLED: this.config.getOrThrow<boolean>("RIDER_ASSIGNMENT_ENABLED"),
      PAYMENT_RECONCILIATION_ENABLED: this.config.getOrThrow<boolean>(
        "PAYMENT_RECONCILIATION_ENABLED"
      )
    };
  }
}
