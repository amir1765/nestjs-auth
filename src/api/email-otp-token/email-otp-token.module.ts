import { Module } from '@nestjs/common';


import { EmailOTPTokenService } from './email-otp-token.service';
import { MailService } from '../../common/mail/mail.service';
import { MailModule } from '../../common/mail/mail.module';




@Module({
  imports: [MailModule],
  providers: [EmailOTPTokenService,MailService,],
  exports: [EmailOTPTokenService],
})
export class EmailOtpTokenModule {}