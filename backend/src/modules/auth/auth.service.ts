import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../common/prisma.service";
import { DomainEventBus } from "../internal-events/domain-event-bus.service";
import { OtpProvider } from "./otp/otp-provider";

@Injectable()
export class AuthService {
  constructor(
    @Inject("OTP_PROVIDER") private readonly otpProvider: OtpProvider,
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    private readonly eventBus: DomainEventBus
  ) {}

  async sendOtp(phone: string) {
    await this.otpProvider.send(phone, "LOGIN");
    await this.eventBus.publish(
      "auth.otp_requested",
      { phone, purpose: "LOGIN" },
      { source: "auth.service" }
    );
    return { message: "OTP sent if phone is valid.", data: null };
  }

  async verifyOtp(phone: string, otp: string) {
    const valid = await this.otpProvider.verify(phone, otp, "LOGIN");
    if (!valid) {
      throw new UnauthorizedException("Invalid OTP");
    }

    const user = await this.prisma.user.upsert({
      where: { phone },
      update: {},
      create: {
        phone,
        status: "ACTIVE",
        roles: {
          create: {
            role: {
              connectOrCreate: {
                where: { code: "CUSTOMER" },
                create: { code: "CUSTOMER", name: "Customer" }
              }
            }
          }
        }
      },
      include: { roles: { include: { role: true } } }
    });

    const roles = user.roles.map((item) => item.role.code);
    const payload = { sub: user.id, phone: user.phone, roles };
    await this.eventBus.publish(
      "auth.otp_verified",
      { userId: user.id, phone: user.phone, roles },
      { source: "auth.service" }
    );

    return {
      data: {
        access_token: await this.jwt.signAsync(payload),
        refresh_token: await this.jwt.signAsync(payload, { expiresIn: "30d" }),
        user: {
          id: user.id,
          phone: user.phone,
          roles
        }
      },
      message: "OTP verified"
    };
  }
}
