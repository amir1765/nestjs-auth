// // src/middleware/request-context.middleware.ts
// import { Injectable, NestMiddleware } from '@nestjs/common';
// import { Request, Response, NextFunction } from 'express';
//
// @Injectable()
// export class RequestContextMiddleware implements NestMiddleware {
//   use(req: Request, res: Response, next: NextFunction) {
//     req['context'] = {
//       ip:
//         req.headers['x-forwarded-for'] ||
//         req.socket.remoteAddress ||
//         null,
//       userAgent: req.headers['user-agent'] || null,
//       requestId: crypto.randomUUID(),
//     };
//
//     next();
//   }
// }