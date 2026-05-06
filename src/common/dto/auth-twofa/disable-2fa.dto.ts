import { ApiProperty } from '@nestjs/swagger';

export class Disable2FADto {
  @ApiProperty()
  userId!: string;

  @ApiProperty({
    example: '123456',
    description: 'Current valid TOTP code',
  })
  token!: string;
}