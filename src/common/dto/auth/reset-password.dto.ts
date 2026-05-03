
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MinLength, MaxLength, Length } from 'class-validator';

export class ResetPasswordDto {
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

  @ApiProperty({
    description: 'The new password the user wants to set',
    example: 'NewStr0ngP@ss',
    minLength: 8,
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(50)
  newPassword!: string;
}