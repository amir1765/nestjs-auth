// mail.processor.ts

import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { MailService } from './mail.service';
import { AuditAction, EmailOTPType } from '@prisma/client';
import { RepositoryRegistry } from '../../repositories/prisma/repository.registry';
export interface SendOtpEmailJob {
  to: string;
  otp: string;
  type: EmailOTPType;
  subject: string;
}
@Processor('email')
export class MailProcessor extends WorkerHost {
  constructor(
    private readonly repo: RepositoryRegistry,
    private readonly mailService: MailService,
  ) {
    super();
  }

  async process(job: Job<SendOtpEmailJob>) {
    switch (job.name) {
      case 'send-otp-email':
        await this.mailService.sendMail({
          to: job.data.to,
          subject: job.data.subject,
          html: `
            <div>
              <h2>Your verification code</h2>
              <p>${job.data.otp}</p>
            </div>
          `,
        });

        break;
    }
  }
  @OnWorkerEvent('failed')
  async onFailed(job: Job | undefined, error: Error) {
    await this.repo.auditLog.create({
      action: AuditAction.WEBHOOK_SENT,
      metadata: {
        jobId: job?.id,
        error: error.message,
      },
    });
    console.error(
      'Email job failed',
      {
        jobId: job?.id,
        jobName: job?.name,
        error: error.message,
      },
    );
  }
}