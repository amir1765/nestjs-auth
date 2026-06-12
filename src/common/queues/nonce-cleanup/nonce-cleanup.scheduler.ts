// otp-cleanup.scheduler.ts

import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUES } from '../queue.constants';

@Injectable()
export class NonceCleanupScheduler implements OnModuleInit {
  constructor(
    @InjectQueue(QUEUES.NONCE_CLEANUP)
    private readonly queue: Queue,
  ) {}

  async onModuleInit() {
    await this.queue.upsertJobScheduler(
      'nonce-cleanup-scheduler',
      {
        every: 20 * 60 * 1000, // every 20 minutes
      },
      {
        name: 'nonce-cleanup',
        data: {},
      },
    );
  }
}