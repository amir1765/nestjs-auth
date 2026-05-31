import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length } from 'class-validator';

export class Generate2FADto {
  @ApiProperty({
    description: 'One-time password (OTP or 2FA code)',
    example: '123456',
  })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6, { message: 'Code must be exactly 6 characters' })
  otp!: string;
  @ApiProperty({
    example: 'user@email.com',
    description: 'User email for QR label',
  })
  email!: string;
}