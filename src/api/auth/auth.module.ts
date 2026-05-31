import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { TokenService } from './token.service';
import { AuditService } from './audit.service';
import { SecurityService } from './security.service';
import { AppJwtModule } from '../../common/jwt/jwt.module';
import { TwoFAModule } from '../auth-twofa/twofa.module';
import { EmailOtpTokenModule } from '../email-otp-token/email-otp-token.module';


@Module({
  imports: [AppJwtModule,TwoFAModule,EmailOtpTokenModule],
  controllers: [AuthController],
  providers: [ AuthService,TokenService,AuditService,SecurityService],
  exports: [AuthService,TokenService,AuditService,SecurityService ],
})
export class AuthModule {}
