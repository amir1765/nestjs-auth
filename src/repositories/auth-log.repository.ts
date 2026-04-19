import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthLogRepository {
  constructor(private prisma: PrismaService) {}

  create(data: {
    userId?: string;
    event: string;
    ip?: string;
    userAgent?: string;
  }) {
    return this.prisma.authLog.create({ data });
  }
}
