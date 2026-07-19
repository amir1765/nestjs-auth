// require-2fa.decorator.ts

import { SetMetadata } from '@nestjs/common';

export const REQUIRE_2FA = 'require_2fa';

export const Require2FA = () =>
  SetMetadata(REQUIRE_2FA, true);