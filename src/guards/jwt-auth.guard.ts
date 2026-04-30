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

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly repo: RepositoryRegistry,
    private readonly redis: RedisStorageRegistry,
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