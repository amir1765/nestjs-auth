import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { TokenService } from './token.service';
import { AuditService } from './audit.service';
import { SecurityService } from './security.service';
import { AppJwtModule } from '../../common/jwt/jwt.module';
import { AuthTokenService } from './token-auth.service';
import { MailModule } from '../../common/mail/mail.module';
import { TwoFAModule } from '../auth-twofa/twofa.module';


@Module({
  imports: [AppJwtModule,MailModule,TwoFAModule],
  controllers: [AuthController],
  providers: [ AuthService,TokenService,AuditService,SecurityService,AuthTokenService ],
  exports: [AuthService,TokenService,AuditService,SecurityService,AuthTokenService ],
})
export class AuthModule {}
