import { Injectable } from '@nestjs/common';
import { UserRepository } from './user.repository';
import { DeviceRepository } from './device.repository';
import { AuthLogRepository } from './auth-log.repository';

@Injectable()
export class RepositoryRegistry {
  constructor(
    public readonly user: UserRepository,
    public readonly device: DeviceRepository,
    public readonly authLog: AuthLogRepository,
  ) {}
}
