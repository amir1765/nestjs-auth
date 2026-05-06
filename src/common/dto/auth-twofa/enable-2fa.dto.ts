import { ApiProperty } from '@nestjs/swagger';

export class Enable2FADto {
  @ApiProperty()
  userId!: string;

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