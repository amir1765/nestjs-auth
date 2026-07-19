import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TwoFAService } from '../api/auth-twofa/twofa.service';
import { REQUIRE_2FA } from '../decorators/require-2fa.decorator';

@Injectable()
export class TwoFactorGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private readonly TwoFAService: TwoFAService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<boolean>(REQUIRE_2FA, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!required) {
      return true;
    }

    const request = context.switchToHttp().getRequest();

    const user = request.user;
    let token: string;
    if (request.get(`X-TOTP-token`)) {
      token = request.get('X-TOTP-token');
    }
    //else if(request.body.TOTP){
    //  token = request.body.TOTP;}
    else {
      throw new UnauthorizedException('TOTP is required');
    }
    const verify = await this.TwoFAService.verify(user.sub, token);
    return verify.success;
  }
}
