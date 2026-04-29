// import { Injectable } from '@nestjs/common';
// import { Prisma, IdempotencyKeyAnon } from '@prisma/client';
// import { PrismaService } from './prisma/prisma.service';
//
// @Injectable()
// export class IdempotencyKeyAnonRepository {
//   constructor(private readonly prisma: PrismaService) {}
//
//   // ---------- CREATE ----------
//   async create(
//     data: Prisma.IdempotencyKeyAnonCreateInput,
//   ): Promise<IdempotencyKeyAnon> {
//     return this.prisma.idempotencyKeyAnon.create({ data });
//   }
//
//   // ---------- FIND ----------
//   async find(key: string): Promise<IdempotencyKeyAnon | null> {
//     return this.prisma.idempotencyKeyAnon.findUnique({
//       where: { key },
//     });
//   }
//
//   // ---------- GET OR CREATE ----------
//   async getOrCreate(params: {
//     key: string;
//     operation: string;
//     expiresAt: Date;
//   }): Promise<IdempotencyKeyAnon> {
//     try {
//       return await this.prisma.idempotencyKeyAnon.create({
//         data: {
//           key: params.key,
//           operation: params.operation,
//           expiresAt: params.expiresAt,
//           response: {},
//         },
//       });
//     } catch {
//       return this.find(params.key) as Promise<IdempotencyKeyAnon>;
//     }
//   }
//
//   // ---------- COMPLETE ----------
//   async markSuccess(
//     id: string,
//     response: Prisma.InputJsonValue,
//   ): Promise<IdempotencyKeyAnon> {
//     return this.prisma.idempotencyKeyAnon.update({
//       where: { id },
//       data: {
//         status: 'success',
//         response,
//       },
//     });
//   }
//
//   async markError(
//     id: string,
//     response: Prisma.InputJsonValue,
//   ): Promise<IdempotencyKeyAnon> {
//     return this.prisma.idempotencyKeyAnon.update({
//       where: { id },
//       data: {
//         status: 'error',
//         response,
//       },
//     });
//   }
//
//   // ---------- CLEANUP ----------
//   async deleteExpired(): Promise<Prisma.BatchPayload> {
//     return this.prisma.idempotencyKeyAnon.deleteMany({
//       where: {
//         expiresAt: { lt: new Date() },
//       },
//     });
//   }
// }
