import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtStrategy } from "./jwt.strategy";
import { MockOtpProvider } from "./otp/mock-otp.provider";
import { SmsOtpProvider } from "./otp/sms-otp.provider";

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>("JWT_ACCESS_SECRET"),
        signOptions: { expiresIn: "1h" }
      })
    })
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    {
      provide: "OTP_PROVIDER",
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const provider = config.get<string>("OTP_PROVIDER");
        if (provider === "sms" || provider === "production") {
          return new SmsOtpProvider();
        }
        return new MockOtpProvider();
      }
    }
  ],
  exports: [AuthService]
})
export class AuthModule {}
