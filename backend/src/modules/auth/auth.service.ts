import { Inject, Injectable, UnauthorizedException, BadRequestException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../common/prisma.service";
import { DomainEventBus } from "../internal-events/domain-event-bus.service";
import { OtpProvider } from "./otp/otp-provider";
import { normalizeIndianPhone } from "../../common/phone.util";

@Injectable()
export class AuthService {
  constructor(
    @Inject("OTP_PROVIDER") private readonly otpProvider: OtpProvider,
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    private readonly eventBus: DomainEventBus
  ) {}

  async sendOtp(phone: string) {
    console.log(`[DEBUG] sendOtp request received for phone: ${phone}`);
    const normalized = normalizeIndianPhone(phone);
    await this.otpProvider.send(normalized, "LOGIN");
    await this.eventBus.publish(
      "auth.otp_requested",
      { phone: normalized, purpose: "LOGIN" },
      { source: "auth.service" }
    );
    return { message: "OTP sent if phone is valid.", data: null };
  }

  async verifyOtp(phone: string, otp: string, appContext: string) {
    if (!appContext) {
      throw new BadRequestException("appContext is required");
    }
    const validContexts = ["CUSTOMER", "PARTNER", "ADMIN"];
    if (!validContexts.includes(appContext)) {
      throw new BadRequestException("Invalid appContext");
    }

    const normalized = normalizeIndianPhone(phone);
    const valid = await this.otpProvider.verify(normalized, otp, "LOGIN");
    if (!valid) {
      throw new UnauthorizedException("Invalid OTP");
    }

    // Ensure we find existing users whether they were stored as legacy 10-digit
    // or already normalized. If found by legacy phone, migrate to normalized.
    let user = await this.prisma.user.findUnique({ where: { phone: normalized } });
    if (!user) {
      // Try legacy 10-digit lookup (no +91 prefix)
      const digits = phone.replace(/\D/g, "");
      if (digits.length === 12 && digits.startsWith("91")) {
        // already had country prefix; fallback to last 10
        const legacy = digits.slice(2);
        user = await this.prisma.user.findUnique({ where: { phone: legacy } });
      } else if (digits.length === 10) {
        user = await this.prisma.user.findUnique({ where: { phone: digits } });
      }
    }

    if (user) {
      // ensure phone is normalized in DB
      if (user.phone !== normalized) {
        user = await this.prisma.user.update({ where: { id: user.id }, data: { phone: normalized } });
      }
      // ensure roles relation exists and fetch roles
      const full = await this.prisma.user.findUnique({ where: { id: user.id }, include: { roles: { include: { role: true } } } });
      user = full as any;
    } else {
      user = await this.prisma.user.create({
        data: {
          phone: normalized,
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
    }

    if (!user) throw new Error("User resolution failed after verifyOtp");
    const finalUser: any = user;
    const roles = finalUser.roles.map((item: any) => item.role.code);

    // Validate role eligibility based on requested appContext
    if (appContext === "PARTNER") {
      const hasPartnerRole = roles.some((r: string) => r === "RIDER" || r === "VENDOR_OWNER" || r === "VENDOR_STAFF");
      if (!hasPartnerRole) {
        throw new UnauthorizedException("Access denied: missing partner roles");
      }
    } else if (appContext === "ADMIN") {
      const hasAdminRole = roles.some((r: string) => r === "ADMIN" || r === "SUPER_ADMIN" || r === "ZONE_ADMIN");
      if (!hasAdminRole) {
        throw new UnauthorizedException("Access denied: missing admin roles");
      }
    }

    const payload = { sub: finalUser.id, phone: finalUser.phone, roles, appContext };
    await this.eventBus.publish(
      "auth.otp_verified",
      { userId: finalUser.id, phone: finalUser.phone, roles, appContext },
      { source: "auth.service" }
    );

    // Resolve context-specific avatar without fallback to legacy avatarUrl
    const avatarUrl = appContext === "PARTNER"
      ? (finalUser.partnerAvatarUrl || null)
      : (finalUser.customerAvatarUrl || null);

    return {
      data: {
        access_token: await this.jwt.signAsync(payload),
        refresh_token: await this.jwt.signAsync(payload, { expiresIn: "30d" }),
        user: {
          id: finalUser.id,
          phone: finalUser.phone,
          roles,
          avatarUrl: avatarUrl
        }
      },
      message: "OTP verified"
    };
  }
}
