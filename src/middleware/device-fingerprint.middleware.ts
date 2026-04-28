import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction } from 'express';

@Injectable()
export class DeviceMiddleware implements NestMiddleware {
  async use(req: Request, res: Response, next: NextFunction) {
    const fingerprint = req.headers['x-device-id'];

    req['device'] = {
      fingerprint,
    };

    next();
  }
}