import { Global, Module } from '@nestjs/common';
import { UserRepository } from './user.repository';

import { RepositoryRegistry } from './repository.registry';
import { SessionRepository } from './session.repository';
import { RefreshTokenRepository } from './refresh-token.repository';
import { DeviceRepository } from './device.repository';

@Global()
@Module({
  providers: [
    UserRepository,
    RepositoryRegistry,
    SessionRepository,
    RefreshTokenRepository,
    DeviceRepository,
  ],
  exports: [RepositoryRegistry],
})
export class RepositoriesModule {}
