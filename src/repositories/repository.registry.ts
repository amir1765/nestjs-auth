import { Injectable } from '@nestjs/common';
import { UserRepository } from './user.repository';
import { SessionRepository } from './session.repository';
import { RefreshTokenRepository } from './refresh-token.repository';

@Injectable()
export class RepositoryRegistry {
  constructor(
    public readonly user: UserRepository,
    public readonly session: SessionRepository,
    public readonly refreshToken: RefreshTokenRepository,
  ) {}
}
