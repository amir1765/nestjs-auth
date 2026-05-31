import { Module } from '@nestjs/common';

import { TwoFAController } from './twofa.controller';
import { TwoFAService } from './twofa.service';
import { AppJwtModule } from '../../common/jwt/jwt.module';
import { AuditService } from '../auth/audit.service';
import { EmailOtpTokenModule } from '../email-otp-token/email-otp-token.module';




@Module({
  imports: [AppJwtModule,EmailOtpTokenModule],
  controllers: [TwoFAController],
  providers: [TwoFAService,AuditService,],
  exports: [TwoFAService],
})
export class TwoFAModule {}