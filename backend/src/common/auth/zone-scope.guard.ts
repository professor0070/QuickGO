import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../../modules/common/prisma.service";

@Injectable()
export class ZoneScopeGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user) return false;

    // Super Admin has global access
    if (user.roles.includes("SUPER_ADMIN")) {
      return true;
    }

    // Only ZONE_ADMIN and ADMIN roles are subject to zone scoping
    if (!user.roles.includes("ZONE_ADMIN") && !user.roles.includes("ADMIN")) {
      return true;
    }

    // Query active database assignments (stale JWT prevention)
    const assignments = await this.prisma.adminZoneAssignment.findMany({
      where: {
        adminUserId: user.id,
        status: "ACTIVE",
        revokedAt: null
      },
      select: { serviceZoneId: true }
    });

    const activeZoneIds = assignments.map((a: any) => a.serviceZoneId);

    if (activeZoneIds.length === 0) {
      throw new ForbiddenException("Access denied: You have no active zone assignments");
    }

    // Attach active zone IDs list to the request object for downstream controllers/services
    request.activeZoneIds = activeZoneIds;

    const params = request.params;

    // 1. Validate vendorId parameter
    if (params.vendorId) {
      const vendor = await this.prisma.vendor.findUnique({
        where: { id: params.vendorId },
        select: { serviceZoneId: true }
      });
      if (!vendor || !activeZoneIds.includes(vendor.serviceZoneId)) {
        throw new ForbiddenException("Access denied: Vendor is outside your assigned zones");
      }
    }

    // 2. Validate riderId parameter
    if (params.riderId) {
      const rider = await this.prisma.rider.findUnique({
        where: { id: params.riderId },
        select: { serviceZoneId: true }
      });
      if (!rider || !activeZoneIds.includes(rider.serviceZoneId)) {
        throw new ForbiddenException("Access denied: Rider is outside your assigned zones");
      }
    }

    // 3. Validate orderId parameter
    if (params.orderId) {
      const order = await this.prisma.order.findUnique({
        where: { id: params.orderId },
        select: { serviceZoneId: true }
      });
      if (!order || !activeZoneIds.includes(order.serviceZoneId)) {
        throw new ForbiddenException("Access denied: Order is outside your assigned zones");
      }
    }

    // 4. Validate documentId parameter (can be vendor compliance doc or rider kyc doc)
    if (params.documentId) {
      const vendorDoc = await this.prisma.vendorComplianceDocument.findUnique({
        where: { id: params.documentId },
        include: { vendor: { select: { serviceZoneId: true } } }
      });
      if (vendorDoc) {
        if (!activeZoneIds.includes(vendorDoc.vendor.serviceZoneId)) {
          throw new ForbiddenException("Access denied: Document is outside your assigned zones");
        }
      } else {
        const riderDoc = await this.prisma.riderKycDocument.findUnique({
          where: { id: params.documentId },
          include: { rider: { select: { serviceZoneId: true } } }
        });
        if (!riderDoc || !activeZoneIds.includes(riderDoc.rider.serviceZoneId)) {
          throw new ForbiddenException("Access denied: Document is outside your assigned zones");
        }
      }
    }

    // 5. Validate zoneId / serviceZoneId parameter
    const zoneId = params.zoneId || params.serviceZoneId;
    if (zoneId) {
      if (!activeZoneIds.includes(zoneId)) {
        throw new ForbiddenException("Access denied: Zone is outside your assigned zones");
      }
    }

    return true;
  }
}
