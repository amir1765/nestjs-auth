import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  IsDate,
  IsOptional,
  IsEmail,
  ValidateNested, Length, MinLength, MaxLength,
} from 'class-validator';



// ---------- Main DTO ----------
export class VerifyOtpDto {
  @ApiProperty({
  description: 'The ID of the user requesting password reset',
  example: '507f1f77bcf86cd799439011',
})
@IsString()
@IsNotEmpty()
userId!: string;

  @ApiProperty({
    description: 'One-time password (OTP) sent to the user',
    example: '123456',
  })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6, { message: 'OTP must be exactly 6 characters' })
  otp!: string;
}
