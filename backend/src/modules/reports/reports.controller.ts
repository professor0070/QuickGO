import { Controller, Get } from "@nestjs/common";
import { Roles } from "../../common/auth/roles.decorator";
import { ReportsService } from "./reports.service";

@Controller("admin/reports")
@Roles("ADMIN", "SUPER_ADMIN")
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get("validation-dashboard")
  validationDashboard() {
    return this.reports.validationDashboard();
  }
}
