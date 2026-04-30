import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { TokenService } from './token.service';
import { AuditService } from './audit.service';
import { SecurityService } from './security.service';
import { AppJwtModule } from '../../common/jwt/jwt.module';


@Module({
  imports: [AppJwtModule],
  controllers: [AuthController],
  providers: [ AuthService,TokenService,AuditService,SecurityService ],
  exports: [AuthService,TokenService,AuditService,SecurityService ],
})
export class AuthModule {}
