import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { AuthHelper } from './auth.helper';

@Module({
  controllers: [],
  providers: [UserService, AuthHelper],
  exports: [UserService, AuthHelper],
})
export class UserModule {}
