import { Injectable } from "@nestjs/common";

export type ServiceZoneDecision = {
  serviceable: boolean;
  zoneId?: string;
  distanceKm?: number;
  reason?: "SERVICE_ZONE_UNAVAILABLE";
};

@Injectable()
export class ServiceabilityService {
  decide(input: {
    latitude: number;
    longitude: number;
    zone: {
      id: string;
      centerLatitude: number;
      centerLongitude: number;
      radiusKm: number;
      active: boolean;
    };
  }): ServiceZoneDecision {
    if (!input.zone.active) {
      return { serviceable: false, reason: "SERVICE_ZONE_UNAVAILABLE" };
    }

    const distanceKm = this.distanceKm(
      input.latitude,
      input.longitude,
      input.zone.centerLatitude,
      input.zone.centerLongitude
    );

    if (distanceKm > input.zone.radiusKm) {
      return {
        serviceable: false,
        distanceKm,
        reason: "SERVICE_ZONE_UNAVAILABLE"
      };
    }

    return { serviceable: true, zoneId: input.zone.id, distanceKm };
  }

  private distanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
    const earthRadiusKm = 6371;
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  private toRad(value: number) {
    return (value * Math.PI) / 180;
  }
}

