// otp-cleanup.processor.ts
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { RepositoryRegistry } from '../../../repositories/prisma/repository.registry';
import { AuditAction } from '@prisma/client';

@Processor('nonce-cleanup', { concurrency: 1, })
export class NonceCleanupProcessor extends WorkerHost {
  constructor(private readonly repo: RepositoryRegistry) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    if (job.name === 'nonce-cleanup') {
      const result = await this.repo.nonce.deleteExpired();
      return {
        deleted: result.count,
      };
    }
  }

  @OnWorkerEvent('failed')
  async onFailed(job: Job | undefined, error: Error) {
    await this.repo.auditLog.create({
      action: AuditAction.ADMIN_ACTION,
      metadata: {
        jobId: job?.id,
        error: error.message,
      },
    });
    console.error('nonce-cleanup job failed', {
      jobId: job?.id,
      jobName: job?.name,
      error: error.message,
    });
  }
}
