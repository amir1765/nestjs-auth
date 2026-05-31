import { Module } from '@nestjs/common';


import { EmailOTPTokenService } from './email-otp-token.service';
import { MailService } from '../../common/mail/mail.service';




@Module({
  providers: [EmailOTPTokenService,MailService],
  exports: [EmailOTPTokenService],
})
export class EmailOtpTokenModule {}