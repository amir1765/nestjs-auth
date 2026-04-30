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
  RefreshResponseDto,
  LoginResponseDto,
  RegisterResponseDto,
} from 'src/common/dto';

// ✅ Strong typing for request user
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
  @ApiOperation({ summary: 'Register new user' })
  @ApiResponse({ status: 201, type: RegisterResponseDto })
  async register(
    @Body() body: RegisterDto,
  ): Promise<RegisterResponseDto> {
    return this.authService.register(body.email, body.password);
  }

  // ===============================
  // 🔐 LOGIN
  // ===============================
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Login user (supports cookie + bearer)',
  })
  @ApiResponse({ status: 200, type: LoginResponseDto })
  async login(
    @Body() body: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LoginResponseDto> {
    const result = await this.authService.login({
      email: body.email,
      password: body.password,
      ip: this.extractIP(req),
      userAgent: req.headers['user-agent'],
      fingerprint: body.fingerprint,
    });

    // ✅ Web support (cookie-based refresh)
    this.attachRefreshCookie(res, result.refreshToken);

    return result;
  }

  // ===============================
  // 🔁 REFRESH TOKEN
  // ===============================
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Refresh tokens (cookie or body)',
  })
  @ApiCookieAuth()
  @ApiResponse({ status: 200, type: RefreshResponseDto })
  async refresh(
    @Body() body: RefreshDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<RefreshResponseDto> {
    const token =
      body.refreshToken || req.cookies?.refreshToken;

    if (!token) {
      throw new UnauthorizedException(
        'Refresh token missing',
      );
    }

    const result = await this.authService.refresh(token);

    // ✅ Rotate cookie
    this.attachRefreshCookie(res, result.refreshToken);

    return result;
  }

  // ===============================
  // 🚪 LOGOUT (CURRENT SESSION)
  // ===============================
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Logout current session' })
  async logout(
    @Req() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
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
  @ApiOperation({ summary: 'Logout all sessions' })
  async logoutAll(
    @Req() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    await this.authService.logoutAll(req.user.sub);

    this.clearRefreshCookie(res);
  }

  // ===============================
  // 🍪 COOKIE HELPERS
  // ===============================
  private attachRefreshCookie(
    res: Response,
    token: string,
  ) {
    res.cookie('refreshToken', token, {
      httpOnly: true,
      secure: true, // 🔥 must be true in production
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