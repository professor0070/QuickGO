import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { RequestUser } from "../../common/auth/current-user.decorator";

type JwtPayload = {
  sub: string;
  phone: string;
  roles: string[];
  appContext?: string;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>("JWT_ACCESS_SECRET")
    });
  }

  validate(payload: JwtPayload): RequestUser {
    if (!payload.appContext) {
      throw new UnauthorizedException("JWT missing valid signed context");
    }
    const validContexts = ["CUSTOMER", "PARTNER", "ADMIN"];
    if (!validContexts.includes(payload.appContext)) {
      throw new UnauthorizedException("JWT missing valid signed context");
    }
    return {
      id: payload.sub,
      phone: payload.phone,
      roles: payload.roles,
      appContext: payload.appContext
    };
  }
}
