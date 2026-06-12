import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class Verify2FADto {
  @IsString()
  @IsNotEmpty()

  @ApiProperty({
    example: '123456 or back up code',
    description: 'TOTP or backup code',
  })
  token!: string;
}