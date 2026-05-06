import {
  Body,
  Controller,
  Post,
} from '@nestjs/common';

import {
  ApiTags,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';

import { TwoFAService } from './twofa.service';

import { Generate2FADto,Enable2FADto, Verify2FADto, Disable2FADto } from 'src/common/dto';

@ApiTags('2FA')
@Controller('2fa')
export class TwoFAController {
  constructor(private readonly twoFAService: TwoFAService) {}

  // --------------------------------------------------
  // 🔐 GENERATE SETUP QR
  // --------------------------------------------------
  @Post('generate')
  @ApiOperation({ summary: 'Generate 2FA secret + QR code' })
  @ApiResponse({
    status: 200,
    description: 'Returns QR + temp secret',
  })
  async generate(@Body() dto: Generate2FADto) {
    return this.twoFAService.generateSetup(dto.userId, dto.email);
  }

  // --------------------------------------------------
  // ✅ ENABLE 2FA
  // --------------------------------------------------
  @Post('enable')
  @ApiOperation({ summary: 'Enable 2FA after verifying OTP' })
  async enable(@Body() dto: Enable2FADto) {
    return this.twoFAService.enable(
      dto.userId,
      dto.token,
      dto.tempSecret,
    );
  }

  // --------------------------------------------------
  // 🔍 VERIFY 2FA (LOGIN STEP)
  // --------------------------------------------------
  @Post('verify')
  @ApiOperation({ summary: 'Verify TOTP or backup code' })
  async verify(@Body() dto: Verify2FADto) {
    return this.twoFAService.verify(dto.userId, dto.token);
  }

  // --------------------------------------------------
  // ❌ DISABLE 2FA
  // --------------------------------------------------
  @Post('disable')
  @ApiOperation({ summary: 'Disable 2FA' })
  async disable(@Body() dto: Disable2FADto) {
    return this.twoFAService.disable(
      dto.userId,
      dto.token,
    );
  }
}