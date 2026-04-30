// src/common/request-context/request-context.middleware.ts

import { BadRequestException, Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { RequestContextService } from './request-context.service';
import { randomUUID } from 'crypto';

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  constructor(private readonly ctx: RequestContextService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket.remoteAddress;
    if (!ip) {
      throw new BadRequestException('No IP detected. Access denied.');
    }
    const userAgent = req.headers['user-agent'] || undefined;

    const fingerprint =
      (req.headers['x-device-fingerprint'] as string) || undefined;

    const contextData = {
      ip,
      userAgent,
      fingerprint,
      requestId: randomUUID(),
    };

    this.ctx.run(contextData, () => next());
  }
}