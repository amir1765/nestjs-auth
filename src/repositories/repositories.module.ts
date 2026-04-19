import { Global, Module } from '@nestjs/common';
import { UserRepository } from './user.repository';
import { DeviceRepository } from './device.repository';
import { AuthLogRepository } from './auth-log.repository';
import { RepositoryRegistry } from './repository.registry';

@Global()
@Module({
  providers: [
    UserRepository,
    DeviceRepository,
    AuthLogRepository,
    RepositoryRegistry,
  ],
  exports: [RepositoryRegistry],
})
export class RepositoriesModule {}
