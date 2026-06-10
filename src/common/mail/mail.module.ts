import { Module } from '@nestjs/common';
import { MailService } from './mail.service';
import { MailProcessor } from './mail.processor';
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'email',
    }),
  ],
  providers: [
    MailService,
    MailProcessor,
  ],
  exports: [MailService,BullModule],
})
export class MailModule {}