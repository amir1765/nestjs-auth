import { Module } from '@nestjs/common';

import { TwoFAController } from './twofa.controller';
import { TwoFAService } from './twofa.service';



@Module({
  controllers: [TwoFAController],
  providers: [TwoFAService,],
  exports: [TwoFAService],
})
export class TwoFAModule {}