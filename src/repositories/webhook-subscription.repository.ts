import { Injectable } from '@nestjs/common';
import { Prisma, WebhookSubscription } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WebhookSubscriptionRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ---------- CREATE ----------
  async create(
    data: Prisma.WebhookSubscriptionCreateInput,
  ): Promise<WebhookSubscription> {
    return this.prisma.webhookSubscription.create({ data });
  }

  // ---------- FIND ----------
  async findById(id: string): Promise<WebhookSubscription | null> {
    return this.prisma.webhookSubscription.findUnique({
      where: { id },
    });
  }

  async findByUser(userId: string): Promise<WebhookSubscription[]> {
    return this.prisma.webhookSubscription.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findEnabled(): Promise<WebhookSubscription[]> {
    return this.prisma.webhookSubscription.findMany({
      where: { enabled: true },
    });
  }

  async findByEvent(event: string): Promise<WebhookSubscription[]> {
    return this.prisma.webhookSubscription.findMany({
      where: {
        enabled: true,
        events: {
          has: event,
        },
      },
    });
  }

  // ---------- UPDATE ----------
  async update(
    id: string,
    data: Prisma.WebhookSubscriptionUpdateInput,
  ): Promise<WebhookSubscription> {
    return this.prisma.webhookSubscription.update({
      where: { id },
      data,
    });
  }

  async enable(id: string): Promise<WebhookSubscription> {
    return this.prisma.webhookSubscription.update({
      where: { id },
      data: { enabled: true },
    });
  }

  async disable(id: string): Promise<WebhookSubscription> {
    return this.prisma.webhookSubscription.update({
      where: { id },
      data: { enabled: false },
    });
  }

  async updateLastSent(id: string): Promise<WebhookSubscription> {
    return this.prisma.webhookSubscription.update({
      where: { id },
      data: {
        lastSentAt: new Date(),
        failureCount: 0,
      },
    });
  }

  async incrementFailure(id: string): Promise<WebhookSubscription> {
    return this.prisma.webhookSubscription.update({
      where: { id },
      data: {
        failureCount: { increment: 1 },
      },
    });
  }

  async resetFailures(id: string): Promise<WebhookSubscription> {
    return this.prisma.webhookSubscription.update({
      where: { id },
      data: {
        failureCount: 0,
      },
    });
  }

  // ---------- SECURITY ----------
  async disableIfFailing(
    id: string,
    threshold = 5,
  ): Promise<WebhookSubscription | null> {
    const sub = await this.findById(id);
    if (!sub) return null;

    if (sub.failureCount >= threshold) {
      return this.disable(id);
    }

    return sub;
  }

  // ---------- DELETE ----------
  async delete(id: string): Promise<WebhookSubscription> {
    return this.prisma.webhookSubscription.delete({
      where: { id },
    });
  }

  async deleteByUser(userId: string): Promise<Prisma.BatchPayload> {
    return this.prisma.webhookSubscription.deleteMany({
      where: { userId },
    });
  }

  // ---------- PAGINATION ----------
  async findPaginated(
    args: Prisma.WebhookSubscriptionFindManyArgs,
  ): Promise<{ data: WebhookSubscription[]; total: number }> {
    const [data, total] = await this.prisma.$transaction([
      this.prisma.webhookSubscription.findMany(args),
      this.prisma.webhookSubscription.count({
        where: args.where,
      }),
    ]);

    return { data, total };
  }
}
