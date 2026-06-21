import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../common/prisma.service";
import { CreateServiceZoneDto, UpdateServiceZoneDto } from "./service-zone.dto";
import { ServiceabilityService, ServiceZoneDecision } from "./serviceability.service";

@Injectable()
export class ServiceZonesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly serviceability: ServiceabilityService
  ) {}

  async checkServiceability(input: {
    latitude: number;
    longitude: number;
  }): Promise<ServiceZoneDecision> {
    const zones = await this.prisma.serviceZone.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "asc" }
    });

    let closest: ServiceZoneDecision | undefined;
    for (const zone of zones) {
      const decision = this.serviceability.decide({
        latitude: input.latitude,
        longitude: input.longitude,
        zone: {
          id: zone.id,
          centerLatitude: Number(zone.centerLatitude),
          centerLongitude: Number(zone.centerLongitude),
          radiusKm: Number(zone.radiusKm),
          active: zone.isActive
        }
      });

      if (decision.serviceable) {
        return decision;
      }

      if (
        decision.distanceKm !== undefined &&
        (closest?.distanceKm === undefined || decision.distanceKm < closest.distanceKm)
      ) {
        closest = decision;
      }
    }

    return {
      serviceable: false,
      distanceKm: closest?.distanceKm,
      reason: "SERVICE_ZONE_UNAVAILABLE"
    };
  }

  adminList() {
    return this.prisma.serviceZone.findMany({
      orderBy: [{ isActive: "desc" }, { city: "asc" }, { name: "asc" }]
    });
  }

  async create(dto: CreateServiceZoneDto, actorId?: string) {
    const zone = await this.prisma.serviceZone.create({
      data: {
        name: dto.name,
        city: dto.city,
        state: dto.state,
        centerLatitude: dto.center_latitude,
        centerLongitude: dto.center_longitude,
        radiusKm: dto.radius_km ?? 3,
        isActive: dto.is_active ?? true
      }
    });

    await this.auditServiceZoneAction({
      actorId,
      action: "admin.service_zone_created",
      zoneId: zone.id,
      reason: dto.reason,
      metadata: { city: dto.city, radiusKm: dto.radius_km ?? 3 }
    });

    return zone;
  }

  async update(zoneId: string, dto: UpdateServiceZoneDto, actorId?: string) {
    const current = await this.prisma.serviceZone.findUnique({ where: { id: zoneId } });
    if (!current) {
      throw new NotFoundException("Service zone not found");
    }

    const zone = await this.prisma.serviceZone.update({
      where: { id: zoneId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.city !== undefined ? { city: dto.city } : {}),
        ...(dto.state !== undefined ? { state: dto.state } : {}),
        ...(dto.center_latitude !== undefined ? { centerLatitude: dto.center_latitude } : {}),
        ...(dto.center_longitude !== undefined ? { centerLongitude: dto.center_longitude } : {}),
        ...(dto.radius_km !== undefined ? { radiusKm: dto.radius_km } : {}),
        ...(dto.is_active !== undefined ? { isActive: dto.is_active } : {})
      }
    });

    await this.auditServiceZoneAction({
      actorId,
      action: "admin.service_zone_updated",
      zoneId,
      reason: dto.reason,
      metadata: { fromActive: current.isActive, toActive: dto.is_active ?? current.isActive }
    });

    return zone;
  }

  private auditServiceZoneAction(input: {
    actorId?: string;
    action: string;
    zoneId: string;
    reason: string;
    metadata?: Record<string, unknown>;
  }) {
    return this.prisma.auditLog.create({
      data: {
        actorId: input.actorId,
        action: input.action,
        entityType: "service_zone",
        entityId: input.zoneId,
        reason: input.reason,
        metadata: input.metadata as Prisma.InputJsonValue | undefined
      }
    });
  }
}
