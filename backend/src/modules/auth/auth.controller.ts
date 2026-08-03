import { Body, Controller, Get, Post } from "@nestjs/common";
import { CurrentUser, RequestUser } from "../../common/auth/current-user.decorator";
import { Public } from "../../common/auth/public.decorator";
import { AuthService } from "./auth.service";
import { SendOtpDto, VerifyOtpDto } from "./dto";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post("send-otp")
  sendOtp(@Body() body: SendOtpDto) {
    return this.authService.sendOtp(body.phone);
  }

  @Public()
  @Post("verify-otp")
  verifyOtp(@Body() body: VerifyOtpDto) {
    return this.authService.verifyOtp(body.phone, body.otp, body.appContext);
  }

  @Get("me")
  me(@CurrentUser() user?: RequestUser) {
    return {
      id: user?.id,
      phone: user?.phone,
      roles: user?.roles ?? [],
      partner_mode_eligibility: {
        vendor:
          user?.roles.some((role) => role === "VENDOR_OWNER" || role === "VENDOR_STAFF") ??
          false,
        rider: user?.roles.includes("RIDER") ?? false
      }
    };
  }
}
