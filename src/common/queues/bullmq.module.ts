import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QUEUES } from './queue.constants';
import { OtpCleanupScheduler } from './otp-cleanup/otp-cleanup.scheduler';
import { SessionCleanupProcessor } from './session-cleanup/session-cleanup.processor';
import { SessionCleanupScheduler } from './session-cleanup/session-cleanup.scheduler';
import { OtpCleanupProcessor } from './otp-cleanup/otp-cleanup.processor';
import { NonceCleanupScheduler } from './nonce-cleanup/nonce-cleanup.scheduler';
import { NonceCleanupProcessor } from './nonce-cleanup/nonce-cleanup.processor';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: QUEUES.OTP_CLEANUP },
      { name: QUEUES.SESSION_CLEANUP },
      { name: QUEUES.NONCE_CLEANUP },

    ),
  ],
  providers: [
    NonceCleanupProcessor,
    NonceCleanupScheduler,
    SessionCleanupProcessor,
    SessionCleanupScheduler,
    OtpCleanupProcessor,
    OtpCleanupScheduler,
  ],
})
export class BullMqModule {}