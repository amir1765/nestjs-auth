import { IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class Enable2FADto {
  @ApiProperty({
    description: 'TOTP token from authenticator app',
    example: '123456',
  })
  @IsString()
  @Length(6, 6)
  token!: string;

  @ApiProperty({ description: 'Temporary secret returned by /2fa/generate' })
  @IsString()
  tempSecret!: string;
}
