import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';

import { Request } from 'express';
import { JwtService } from '@nestjs/jwt';
import { RepositoryRegistry } from 'src/repositories/prisma/repository.registry';
import { RedisStorageRegistry } from 'src/redis/redis-storage.registry';
import { RequestContextService } from '../common/request-context/request-context.service';
import { AuditService } from '../api/audit/audit.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly repo: RepositoryRegistry,
    private readonly redis: RedisStorageRegistry,
    private readonly audit: AuditService,
    private readonly ctx: RequestContextService,

  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();

    const token = this.extractToken(req);

    if (!token) {
      throw new UnauthorizedException('Missing token');
    }

    // ===============================
    // 🔐 VERIFY JWT
    // ===============================
    let payload: { sub: string; sid: string };

    try {
      payload = await this.jwt.verifyAsync(token);
    } catch {
      throw new UnauthorizedException('Invalid token');
    }

    // ===============================
    // ⚡ REDIS LOOKUP (MINIMAL)
    // ===============================
    let session = await this.redis.sessionStore.get(payload.sid);

    // ===============================
    // 🧾 DB FALLBACK
    // ===============================
    if (!session) {
      const dbSession = await this.repo.session.findById(payload.sid);

      if (!dbSession) {
        throw new UnauthorizedException('Session not found');
      }

      session = {
        userId: dbSession.userId,
        isRevoked: dbSession.isRevoked,
        ipAddress: dbSession.ipAddress ?? undefined,
        userAgent: dbSession.userAgent ?? undefined,
      };



      await this.redis.sessionStore.set(payload.sid, session, dbSession.expiresAt, );
    }

    // ===============================
    // 🔒 VALIDATION
    // ===============================
    if (session.isRevoked) {
      throw new UnauthorizedException('Session revoked');
    }

    if (session.userId !== payload.sub) {
      throw new UnauthorizedException('Token mismatch');
    }
// ===============================
// 🚨 SESSION HIJACK DETECTION
// ===============================
    const { ip, userAgent } = this.ctx.get();

// 🚨 IP check (soft)
    if (session.ipAddress && ip && session.ipAddress !== ip) {
      // optional: allow small drift
      await this.repo.session.revoke(payload.sid, 'IP_MISMATCH');
      await this.redis.sessionStore.del(payload.sid);
      await this.audit.sessionHijackDetected({
        userId: payload.sub,
        sessionId: payload.sid,
        reason: 'IP_MISMATCH',
        ipAddress:ip,
        userAgent: userAgent,
        metadata: {
          expectedIp: session.ipAddress,
          ipAddress: ip,
        }
      });
      throw new UnauthorizedException('Session hijacked (IP)');
    }

// 🚨 UA check (less strict)
    if (
      session.userAgent &&
      userAgent &&
      !userAgent.includes(session.userAgent)
    ) {
      await this.repo.session.revoke(payload.sid, 'UA_MISMATCH');
      await this.redis.sessionStore.del(payload.sid);
      await this.audit.sessionHijackDetected({
        userId: payload.sub,
        sessionId: payload.sid,
        reason: 'UA_MISMATCH',
        ipAddress:ip,
        userAgent: userAgent,
        metadata: {
          expectedUA: session.userAgent,
          userAgent: userAgent,
        },
      });

      throw new UnauthorizedException('Session hijacked (UA)');
    }
    // ===============================
    // 👤 ATTACH USER
    // ===============================
    req['user'] = {
      sub: payload.sub,
      sid: payload.sid,
    };

    return true;
  }

  private extractToken(req: Request): string | null {
    const auth = req.headers['authorization'];

    if (auth) {
      const [type, token] = auth.split(' ');
      if (type === 'Bearer') return token;
    }

    return req.cookies?.accessToken || null;
  }
}