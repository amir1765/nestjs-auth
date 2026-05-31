import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length } from 'class-validator';

export class Enable2FADto {
  @ApiProperty({
    description: 'One-time password (OTP or 2FA code)',
    example: '123456',
  })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6, { message: 'Code must be exactly 6 characters' })
  otp!: string;

  @ApiProperty({
    example: '123456',
    description: 'TOTP code from authenticator app',
  })
  token!: string;

  @ApiProperty({
    example: 'JBSWY3DPEHPK3PXP',
    description: 'Temporary secret returned during setup',
  })
  tempSecret!: string;
}