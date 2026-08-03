import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ROLES_KEY } from "./roles.decorator";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass()
    ]);

    if (!required || required.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: { roles?: string[]; appContext?: string } }>();
    const user = request.user;
    if (!user || !user.appContext) {
      return false;
    }

    const appContext = user.appContext;
    const roles = user.roles ?? [];

    // Enforce strict appContext routing boundaries to prevent dual-role token reuse
    if (appContext === "CUSTOMER") {
      const hasPartnerOrAdminRequired = required.some((role) =>
        ["RIDER", "VENDOR_OWNER", "VENDOR_STAFF", "ADMIN", "SUPER_ADMIN", "ZONE_ADMIN"].includes(role)
      );
      if (hasPartnerOrAdminRequired) {
        return false;
      }
    } else if (appContext === "PARTNER") {
      const hasCustomerOrAdminRequired = required.some((role) =>
        ["CUSTOMER", "ADMIN", "SUPER_ADMIN", "ZONE_ADMIN"].includes(role)
      );
      if (hasCustomerOrAdminRequired) {
        return false;
      }
    } else if (appContext === "ADMIN") {
      const hasCustomerOrPartnerRequired = required.some((role) =>
        ["CUSTOMER", "RIDER", "VENDOR_OWNER", "VENDOR_STAFF"].includes(role)
      );
      if (hasCustomerOrPartnerRequired) {
        return false;
      }
    }

    return required.some((role) => roles.includes(role));
  }
}

