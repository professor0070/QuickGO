import { Controller, Get } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Public } from "../../common/auth/public.decorator";

@Controller("system")
export class AppVersionsController {
  constructor(private readonly config: ConfigService) {}

  @Public()
  @Get("version")
  version() {
    return {
      app_version: this.config.getOrThrow<string>("APP_VERSION"),
      min_version: "1.0.0",
      latest_version: "1.0.0",
      force_update: false,
      maintenance: this.config.getOrThrow<boolean>("MAINTENANCE_MODE")
    };
  }

  @Public()
  @Get("health")
  health() {
    return {
      status: "ok",
      service: "quickgo-backend",
      environment: this.config.getOrThrow<string>("NODE_ENV"),
      timestamp: new Date().toISOString()
    };
  }
}
