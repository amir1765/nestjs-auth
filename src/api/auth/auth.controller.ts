import {
  Body,
  Controller,
  Post,
  UseGuards,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';

import { Request, Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiCookieAuth,
} from '@nestjs/swagger';

import { AuthService } from './auth.service';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';

import {
  RegisterDto,
  LoginDto,
  RefreshDto,
  VerifyOtpDto,
  ResetPasswordDto,
} from 'src/common/dto';

type AuthenticatedRequest = Request & {
  user: {
    sub: string;
    sid: string;
  };
};

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ===============================
  // 🧾 REGISTER
  // ===============================
  @Post('register')
  async register(@Body() body: RegisterDto) {
    return this.authService.register(body.email, body.password);
  }

  // ===============================
  // 📩 VERIFY EMAIL OTP
  // ===============================
  @Post('verify-email')
  async verifyEmail(@Body() body: VerifyOtpDto) {
    return this.authService.verifyEmail(body.userId, body.otp);
  }

  // ===============================
  // 🔐 LOGIN (STEP 1 → PASSWORD)
  // ===============================
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: LoginDto) {
    return this.authService.login({
      email: body.email,
      password: body.password,
    });
  }

  // ===============================
  // 🔐 LOGIN (STEP 2 → OTP)
  // ===============================
  @Post('verify-login')
  @HttpCode(HttpStatus.OK)
  async verifyLogin(
    @Body() body: VerifyOtpDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.verifyLoginOTP(
      body.userId,
      body.otp,
    );

    // ✅ attach refresh cookie
    this.attachRefreshCookie(res, result.refreshToken);

    return result;
  }

  // ===============================
  // 🔁 REFRESH TOKEN
  // ===============================
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiCookieAuth()
  async refresh(
    @Body() body: RefreshDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token =
      body.refreshToken || req.cookies?.refreshToken;

    if (!token) {
      throw new UnauthorizedException('Refresh token missing');
    }

    const result = await this.authService.refresh(token);

    this.attachRefreshCookie(res, result.refreshToken);

    return result;
  }

  // ===============================
  // 🔑 REQUEST PASSWORD RESET
  // ===============================
  @Post('request-password-reset')
  async requestPasswordReset(@Body('email') email: string) {
    return this.authService.requestPasswordReset(email);
  }

  // ===============================
  // 🔑 RESET PASSWORD (OTP)
  // ===============================
  @Post('reset-password')
  async resetPassword(@Body() body: ResetPasswordDto) {
    return this.authService.resetPassword(
      body.userId,
      body.otp,
      body.newPassword,
    );
  }

  // ===============================
  // 🚪 LOGOUT
  // ===============================
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @Req() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { sid, sub } = req.user;

    await this.authService.logout(
      sid,
      sub,
      this.extractIP(req),
    );

    this.clearRefreshCookie(res);
  }

  // ===============================
  // 🚪 LOGOUT ALL
  // ===============================
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('logout-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logoutAll(
    @Req() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.logoutAll(req.user.sub);
    this.clearRefreshCookie(res);
  }

  // ===============================
  // 🍪 COOKIE HELPERS
  // ===============================
  private attachRefreshCookie(res: Response, token: string) {
    res.cookie('refreshToken', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      path: '/auth/refresh',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }

  private clearRefreshCookie(res: Response) {
    res.clearCookie('refreshToken', {
      path: '/auth/refresh',
    });
  }

  // ===============================
  // 🌐 REQUEST HELPERS
  // ===============================
  private extractIP(req: Request): string {
    return (
      (req.headers['x-forwarded-for'] as string)
        ?.split(',')[0]
        ?.trim() ||
      req.socket?.remoteAddress ||
      ''
    );
  }
}