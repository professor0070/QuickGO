import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { IsNumber } from "class-validator";
import { CurrentUser, RequestUser } from "../../common/auth/current-user.decorator";
import { Roles } from "../../common/auth/roles.decorator";
import { CreateServiceZoneDto, UpdateServiceZoneDto } from "./service-zone.dto";
import { ServiceZonesService } from "./service-zones.service";

class ServiceabilityCheckDto {
  @IsNumber()
  latitude!: number;

  @IsNumber()
  longitude!: number;
}

@Controller()
export class ServiceZonesController {
  constructor(private readonly serviceZones: ServiceZonesService) {}

  @Roles("CUSTOMER")
  @Post("customer/serviceability")
  check(@Body() body: ServiceabilityCheckDto) {
    return this.serviceZones.checkServiceability(body);
  }

  @Roles("ADMIN", "SUPER_ADMIN")
  @Get("admin/service-zones")
  adminList() {
    return this.serviceZones.adminList();
  }

  @Roles("ADMIN", "SUPER_ADMIN")
  @Post("admin/service-zones")
  async adminCreate(
    @CurrentUser() user: RequestUser,
    @Body() body: CreateServiceZoneDto
  ) {
    return {
      data: await this.serviceZones.create(body, user.id),
      message: "Service zone created"
    };
  }

  @Roles("ADMIN", "SUPER_ADMIN")
  @Patch("admin/service-zones/:zoneId")
  async adminUpdate(
    @CurrentUser() user: RequestUser,
    @Param("zoneId") zoneId: string,
    @Body() body: UpdateServiceZoneDto
  ) {
    return {
      data: await this.serviceZones.update(zoneId, body, user.id),
      message: "Service zone updated"
    };
  }
}
