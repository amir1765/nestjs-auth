import { Injectable } from '@nestjs/common';
import { UserRepository } from './user.repository';
import { SessionRepository } from './session.repository';

@Injectable()
export class RepositoryRegistry {
  constructor(
    public readonly user: UserRepository,
    public readonly session: SessionRepository,
  ) {}
}
