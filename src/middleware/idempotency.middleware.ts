// // src/middleware/idempotency.middleware.ts
// import { Injectable, NestMiddleware } from '@nestjs/common';
// import { RepositoryRegistry } from '../repositories/prisma/repository.registry';
// import { NextFunction } from 'express';
//
// @Injectable()
// export class IdempotencyMiddleware implements NestMiddleware {
//   constructor(private readonly repo: RepositoryRegistry) {}
//
//   async use(req: Request, res: Response, next: NextFunction) {
//     const key = req.headers['idempotency-key'] as string;
//
//     if (!key) return next();
//
//     const userId = req['user']?.userId;
//
//     const record = userId
//       ? await this.repo.idempotencyKey.find(userId, key)
//       : await this.repo.idempotencyKeyAnon.find(key);
//
//     if (record && record.status === 'success') {
//       return res.json(record.response);
//     }
//
//     req['idempotencyKey'] = key;
//
//     next();
//   }
// }