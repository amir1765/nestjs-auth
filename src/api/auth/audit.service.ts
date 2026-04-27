import { Injectable } from '@nestjs/common';
import { AuditAction } from '@prisma/client';
import { RepositoryRegistry } from 'src/repositories/prisma/repository.registry';

type AuditParams = {
  action: AuditAction;
  userId?: string;
  sessionId?: string;
  deviceId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: any;
  severity?: 'info' | 'warning' | 'critical';
};

@Injectable()
export class AuditService {
  constructor(private readonly repo: RepositoryRegistry) {}

  // =====================================================
  // 🧾 GENERIC LOG
  // =====================================================
  async log(params: AuditParams) {
    return this.repo.auditLog.create({
      action: params.action,
      user: params.userId
        ? { connect: { id: params.userId } }
        : undefined,
      session: params.sessionId
        ? { connect: { id: params.sessionId } }
        : undefined,
      device: params.deviceId
        ? { connect: { id: params.deviceId } }
        : undefined,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      metadata: params.metadata,
      severity: params.severity ?? 'info',
    });
  }

  // =====================================================
  // 🔐 AUTH EVENTS
  // =====================================================
  async loginSuccess(params: {
    userId: string;
    sessionId: string;
    deviceId?: string;
    ipAddress?: string;
    userAgent?: string;
  }) {
    return this.log({
      action: AuditAction.LOGIN_SUCCESS,
      userId: params.userId,
      sessionId: params.sessionId,
      deviceId: params.deviceId,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });
  }

  async loginFailure(params: {
    userId?: string;
    email: string;
    ipAddress?: string;
    userAgent?: string;
  }) {
    return this.log({
      action: AuditAction.LOGIN_FAILURE,
      userId: params.userId,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      metadata: { email: params.email },
      severity: 'warning',
    });
  }

  async logout(params: {
    userId: string;
    sessionId: string;
    ipAddress?: string;
  }) {
    return this.log({
      action: AuditAction.LOGOUT,
      userId: params.userId,
      sessionId: params.sessionId,
      ipAddress: params.ipAddress,
    });
  }

  async logoutAll(params: {
    userId: string;
  }) {
    return this.log({
      action: AuditAction.FORCE_LOGOUT_ALL,
      userId: params.userId,
      severity: 'warning',
    });
  }

  // =====================================================
  // 🔁 TOKEN EVENTS
  // =====================================================
  async tokenRefreshed(params: {
    userId: string;
    sessionId: string;
  }) {
    return this.log({
      action: AuditAction.TOKEN_REFRESH,
      userId: params.userId,
      sessionId: params.sessionId,
    });
  }

  async tokenReuseDetected(params: {
    userId: string;
    sessionId: string;
    ipAddress?: string;
    userAgent?: string;
  }) {
    return this.log({
      action: AuditAction.TOKEN_REUSE_DETECTED,
      userId: params.userId,
      sessionId: params.sessionId,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      severity: 'critical',
    });
  }

  // =====================================================
  // 🛡 SECURITY EVENTS
  // =====================================================
  async suspiciousActivity(params: {
    userId: string;
    deviceId?: string;
    ipAddress?: string;
    reasons: string[];
  }) {
    return this.log({
      action: AuditAction.SUSPICIOUS_ACTIVITY,
      userId: params.userId,
      deviceId: params.deviceId,
      ipAddress: params.ipAddress,
      metadata: { reasons: params.reasons },
      severity: 'warning',
    });
  }

  async sessionRevoked(params: {
    userId: string;
    sessionId: string;
    reason: string;
  }) {
    return this.log({
      action: AuditAction.SESSION_REVOKE,
      userId: params.userId,
      sessionId: params.sessionId,
      metadata: { reason: params.reason },
      severity: 'warning',
    });
  }
}