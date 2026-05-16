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

  // --------------------------------------------------
  // 🔐 GENERATE SETUP QR
  // --------------------------------------------------
  @Post('generate')
  @ApiOperation({ summary: 'Generate 2FA secret + QR code' })
  @ApiResponse({
    status: 200,
    description: 'Returns QR + temp secret',
  })
  async generate(@Req() req: Request,@Body() dto: Generate2FADto) {
    const userId = req['user'].sub;

    return this.twoFAService.generateSetup(userId, dto.email);
  }

  // --------------------------------------------------
  // ✅ ENABLE 2FA
  // --------------------------------------------------
  @Post('enable')
  @ApiOperation({ summary: 'Enable 2FA after verifying OTP' })
  async enable(@Req() req: Request,@Body() dto: Enable2FADto) {
    const userId = req['user'].sub;
    return this.twoFAService.enable(
      userId,
      dto.token,
      dto.tempSecret,
    );
  }

  // --------------------------------------------------
  // 🔍 VERIFY 2FA (LOGIN STEP)
  // --------------------------------------------------
  @Post('verify')
  @ApiOperation({ summary: 'Verify TOTP or backup code' })
  async verify(@Req() req: Request,@Body() dto: Verify2FADto) {
    const userId = req['user'].sub;

    return this.twoFAService.verify(userId, dto.token);
  }

  // --------------------------------------------------
  // ❌ DISABLE 2FA
  // --------------------------------------------------
  @Post('disable')
  @ApiOperation({ summary: 'Disable 2FA' })
  async disable(@Req() req: Request,@Body() dto: Disable2FADto) {
    const userId = req['user'].sub;

    return this.twoFAService.disable(
      userId,
      dto.token,
    );
  }
}