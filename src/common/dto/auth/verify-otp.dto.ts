import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, Length, IsEnum } from 'class-validator';

// ✅ Define enum
export enum VerifyType {
  OTP = 'OTP',
  TOTP = 'TOTP',
}

// ---------- DTO ----------
export class VerifyOtpDto {
  @ApiProperty({
    description: 'The ID of the user',
    example: '507f1f77bcf86cd799439011',
  })
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @ApiProperty({
    description: 'One-time password (OTP or 2FA code)',
    example: '123456',
  })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6, { message: 'Code must be exactly 6 characters' })
  otp!: string;

  // ✅ NEW FIELD
  @ApiProperty({
    description: 'Verification type',
    enum: VerifyType,
    example: VerifyType.OTP,
  })
  @IsEnum(VerifyType)
  verifyType!: VerifyType;
}