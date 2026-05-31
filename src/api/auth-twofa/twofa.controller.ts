import {
  Body,
  Controller,
  Post, UseGuards,Req,
} from '@nestjs/common';

import {
  ApiTags,
  ApiOperation,
  ApiResponse, ApiBearerAuth,
} from '@nestjs/swagger';

import { TwoFAService } from './twofa.service';

import { Generate2FADto,Enable2FADto, Verify2FADto, Disable2FADto } from 'src/common/dto';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiTags('2FA')
@Controller('2fa')
export class TwoFAController {
  constructor(private readonly twoFAService: TwoFAService) {}
  // ==================================================
  // 📩 REQUEST ENABLE OTP
  // ==================================================

  @Post('request-enable')
  @ApiOperation({
    summary:
      'Send email OTP for enabling 2FA',
  })
  @ApiResponse({
    status: 200,
    description:
      'Enable 2FA OTP sent successfully',
  })
  async requestEnable(
    @Req() req: Request,
  ) {
    const userId = req['user'].sub;

    return this.twoFAService.requestEnableOTP(
      userId,
    );
  }

  // ==================================================
  // 📩 REQUEST DISABLE OTP
  // ==================================================

  @Post('request-disable')
  @ApiOperation({
    summary:
      'Send email OTP for disabling 2FA',
  })
  @ApiResponse({
    status: 200,
    description:
      'Disable 2FA OTP sent successfully',
  })
  async requestDisable(
    @Req() req: Request,
  ) {
    const userId = req['user'].sub;

    return this.twoFAService.requestDisableOTP(
      userId,
    );
  }

  // ==================================================
  // 🔑 GENERATE SETUP
  // ==================================================

  @Post('generate')
  @ApiOperation({
    summary:
      'Generate 2FA setup secret and QR',
  })
  @ApiResponse({
    status: 200,
    description:
      'Returns otpauth URL',
  })
  async generate(
    @Req() req: Request,
    @Body() dto: Generate2FADto,
  ) {
    const userId = req['user'].sub;

    return this.twoFAService.generateSetup(
      userId,
      dto.otp,
    );
  }

  // ==================================================
  // ✅ ENABLE 2FA
  // ==================================================

  @Post('enable')
  @ApiOperation({
    summary: 'Enable 2FA',
  })
  @ApiResponse({
    status: 200,
    description:
      '2FA enabled successfully',
  })
  async enable(
    @Req() req: Request,
    @Body() dto: Enable2FADto,
  ) {
    const userId = req['user'].sub;

    return this.twoFAService.enable(
      userId,
      dto.token,
    );
  }

  // ==================================================
  // 🔍 VERIFY 2FA
  // ==================================================

  @Post('verify')
  @ApiOperation({
    summary:
      'Verify TOTP or backup code',
  })
  @ApiResponse({
    status: 200,
    description:
      '2FA verified successfully',
  })
  async verify(
    @Req() req: Request,
    @Body() dto: Verify2FADto,
  ) {
    const userId = req['user'].sub;

    return this.twoFAService.verify(
      userId,
      dto.token,
    );
  }

  // ==================================================
  // ❌ DISABLE 2FA
  // ==================================================

  @Post('disable')
  @ApiOperation({
    summary: 'Disable 2FA',
  })
  @ApiResponse({
    status: 200,
    description:
      '2FA disabled successfully',
  })
  async disable(
    @Req() req: Request,
    @Body() dto: Disable2FADto,
  ) {
    const userId = req['user'].sub;

    return this.twoFAService.disable(
      userId,
      dto.token,
      dto.otp,
    );
  }

  // ==================================================
  // 🔄 REGENERATE BACKUP CODES
  // ==================================================

  @Post('regenerate-backup-codes')
  @ApiOperation({
    summary:
      'Regenerate backup recovery codes',
  })
  @ApiResponse({
    status: 200,
    description:
      'Backup codes regenerated successfully',
  })
  async regenerateBackupCodes(
    @Req() req: Request,
    @Body() dto: Verify2FADto,
  ) {
    const userId = req['user'].sub;

    return this.twoFAService.regenerateBackupCodes(
      userId,
      dto.token,
    );
  }
}