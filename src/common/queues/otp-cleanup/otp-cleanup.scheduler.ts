// otp-cleanup.scheduler.ts

import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUES } from '../queue.constants';

@Injectable()
export class OtpCleanupScheduler implements OnModuleInit {
  constructor(
    @InjectQueue(QUEUES.OTP_CLEANUP)
    private readonly queue: Queue,
  ) {}

  async onModuleInit() {
    await this.queue.upsertJobScheduler(
      'otp-cleanup-scheduler',
      {
        every: 5 * 60 * 1000, // every 5 minutes
      },
      {
        name: 'cleanup',
        data: {},
      },
    );
  }
}