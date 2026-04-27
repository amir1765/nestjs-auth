import { Injectable } from '@nestjs/common';
import { Device, DeviceRiskLevel } from '@prisma/client';
import { RepositoryRegistry } from 'src/repositories/prisma/repository.registry';

type RiskResult = {
  level: DeviceRiskLevel;
  reasons: string[];
};

@Injectable()
export class SecurityService {
  constructor(private readonly repo: RepositoryRegistry) {}

  // =====================================================
  // 🔐 DEVICE RESOLUTION (CREATE OR UPDATE)
  // =====================================================
  async resolveDevice(params: {
    userId: string;
    fingerprint: string;
    userAgent?: string;
    ipAddress?: string;
    country?: string;
    city?: string;
    lat?: number;
    lon?: number;
  }): Promise<Device> {
    return this.repo.device.upsertByFingerprint({
      userId: params.userId,
      fingerprint: params.fingerprint,
      userAgent: params.userAgent,
      ipAddress: params.ipAddress,
      country: params.country,
      city: params.city,
      lat: params.lat,
      lon: params.lon,
    });
  }

  // =====================================================
  // 🧠 RISK EVALUATION (LOGIN TIME)
  // =====================================================
  evaluateLoginRisk(params: {
    device: Device | null;
    ipAddress?: string;
    userAgent?: string;
    country?: string;
  }): RiskResult {
    const reasons: string[] = [];

    // 🚨 No device → high risk
    if (!params.device) {
      return {
        level: DeviceRiskLevel.HIGH,
        reasons: ['NEW_DEVICE'],
      };
    }

    const device = params.device;

    // 🚫 blocked device
    if (device.blocked) {
      return {
        level: DeviceRiskLevel.BLOCKED,
        reasons: ['DEVICE_BLOCKED'],
      };
    }

    // 🌍 IP change
    if (params.ipAddress && device.ipAddress !== params.ipAddress) {
      reasons.push('IP_CHANGED');
    }

    // 🌍 country change
    if (params.country && device.country !== params.country) {
      reasons.push('COUNTRY_CHANGED');
    }

    // 🖥 user agent change
    if (params.userAgent && device.userAgent !== params.userAgent) {
      reasons.push('USER_AGENT_CHANGED');
    }

    // 🔥 decide level
    if (reasons.length === 0) {
      return {
        level: DeviceRiskLevel.LOW,
        reasons: [],
      };
    }

    if (reasons.length === 1) {
      return {
        level: DeviceRiskLevel.MEDIUM,
        reasons,
      };
    }

    return {
      level: DeviceRiskLevel.HIGH,
      reasons,
    };
  }

  // =====================================================
  // 🛡 APPLY RISK TO DEVICE (UPDATE DB)
  // =====================================================
  async applyRiskToDevice(deviceId: string, risk: DeviceRiskLevel) {
    return this.repo.device.updateRiskLevel(deviceId, risk);
  }

  // =====================================================
  // 🚨 SESSION HIJACK DETECTION
  // (used later in middleware)
  // =====================================================
  async detectSessionHijack(params: {
    sessionId: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<boolean> {
    const session = await this.repo.session.findWithRelations(
      params.sessionId,
    );

    if (!session || session.isRevoked) {
      return true;
    }

    // compare IP
    if (
      params.ipAddress &&
      session.ipAddress &&
      params.ipAddress !== session.ipAddress
    ) {
      await this.repo.session.revoke(session.id, 'IP_MISMATCH');
      return true;
    }

    // compare user agent
    if (
      params.userAgent &&
      session.userAgent &&
      params.userAgent !== session.userAgent
    ) {
      await this.repo.session.revoke(session.id, 'UA_MISMATCH');
      return true;
    }

    return false;
  }

  // =====================================================
  // 🔐 DEVICE SECURITY CHECK (LOGIN BLOCK)
  // =====================================================
  ensureDeviceAllowed(device: Device) {
    if (device.blocked) {
      throw new Error('Device is blocked');
    }
  }

  // =====================================================
  // 🌍 IMPOSSIBLE TRAVEL DETECTION (OPTIONAL ADVANCED)
  // =====================================================
  isImpossibleTravel(params: {
    previousLat?: number;
    previousLon?: number;
    currentLat?: number;
    currentLon?: number;
    timeDiffMs: number;
  }): boolean {
    const {
      previousLat,
      previousLon,
      currentLat,
      currentLon,
      timeDiffMs,
    } = params;

    if (
      !previousLat ||
      !previousLon ||
      !currentLat ||
      !currentLon
    ) {
      return false;
    }

    const distance = this.haversineDistance(
      previousLat,
      previousLon,
      currentLat,
      currentLon,
    );

    const hours = timeDiffMs / (1000 * 60 * 60);

    const speed = distance / hours;

    // 🚨 unrealistic speed (> 900km/h)
    return speed > 900;
  }

  private haversineDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371; // km

    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
      Math.cos(this.toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  private toRad(value: number) {
    return (value * Math.PI) / 180;
  }
}