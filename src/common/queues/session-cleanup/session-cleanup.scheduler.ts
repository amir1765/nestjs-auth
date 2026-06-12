// session-cleanup.scheduler.ts

import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUES } from '../queue.constants';

@Injectable()
export class SessionCleanupScheduler implements OnModuleInit {
  constructor(
    @InjectQueue(QUEUES.SESSION_CLEANUP)
    private readonly queue: Queue,
  ) {}

  async onModuleInit() {
    await this.queue.upsertJobScheduler(
      'session-cleanup-scheduler',
      {
        every:  86400 * 1000, // every 14 days
      },
      {
        name: 'session-cleanup',
        data: {},
      },
    );
  }
}