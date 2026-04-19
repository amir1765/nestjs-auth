import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DeviceRepository {
  constructor(private prisma: PrismaService) {}

  create(data: any) {
    return this.prisma.device.create({ data });
  }

  revoke(id: string) {
    return this.prisma.device.update({
      where: { id },
      data: { isRevoked: true },
    });
  }
}
