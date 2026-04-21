import { Global, Module } from '@nestjs/common';
import { UserRepository } from './user.repository';

import { RepositoryRegistry } from './repository.registry';
import { SessionRepository } from './session.repository';

@Global()
@Module({
  providers: [UserRepository, RepositoryRegistry, SessionRepository],
  exports: [RepositoryRegistry],
})
export class RepositoriesModule {}
