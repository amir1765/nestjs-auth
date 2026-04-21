import { Global, Module } from '@nestjs/common';
import { UserRepository } from './user.repository';

import { RepositoryRegistry } from './repository.registry';
import { SessionRepository } from './session.repository';
import { RefreshTokenRepository } from './refresh-token.repository';

@Global()
@Module({
  providers: [
    UserRepository,
    RepositoryRegistry,
    SessionRepository,
    RefreshTokenRepository,
  ],
  exports: [RepositoryRegistry],
})
export class RepositoriesModule {}
