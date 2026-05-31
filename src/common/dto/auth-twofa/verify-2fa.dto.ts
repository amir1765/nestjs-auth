import { ApiProperty } from '@nestjs/swagger';

export class Verify2FADto {
  @ApiProperty({
    example: '123456',
    description: 'TOTP or backup code',
  })
  token!: string;
}