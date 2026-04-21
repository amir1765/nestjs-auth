import { Global, Module } from '@nestjs/common';
import { UserRepository } from './user.repository';

import { RepositoryRegistry } from './repository.registry';

@Global()
@Module({
  providers: [UserRepository, RepositoryRegistry],
  exports: [RepositoryRegistry],
})
export class RepositoriesModule {}
