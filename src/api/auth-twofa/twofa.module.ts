import { Module } from '@nestjs/common';

import { TwoFAController } from './twofa.controller';
import { TwoFAService } from './twofa.service';
import { AppJwtModule } from '../../common/jwt/jwt.module';
import { AuditService } from '../auth/audit.service';




@Module({
  imports: [AppJwtModule],
  controllers: [TwoFAController],
  providers: [TwoFAService,AuditService],
  exports: [TwoFAService],
})
export class TwoFAModule {}