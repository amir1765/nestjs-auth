import { Global, Module } from '@nestjs/common';

import { TwoFAController } from './twofa.controller';
import { TwoFAService } from './twofa.service';
import { AppJwtModule } from '../../common/jwt/jwt.module';
import { EmailOtpTokenModule } from '../email-otp-token/email-otp-token.module';

@Global()
@Module({
  imports: [AppJwtModule,EmailOtpTokenModule],
  controllers: [TwoFAController],
  providers: [TwoFAService,],
  exports: [TwoFAService],
})
export class TwoFAModule {}