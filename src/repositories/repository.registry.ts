import { Injectable } from '@nestjs/common';
import { UserRepository } from './user.repository';

@Injectable()
export class RepositoryRegistry {
  constructor(public readonly user: UserRepository) {}
}
