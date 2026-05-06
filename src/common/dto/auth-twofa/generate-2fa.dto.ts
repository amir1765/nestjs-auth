import { ApiProperty } from '@nestjs/swagger';

export class Generate2FADto {
  @ApiProperty({
    example: 'user-id-123',
    description: 'User ID requesting 2FA setup',
  })
  userId!: string;

  @ApiProperty({
    example: 'user@email.com',
    description: 'User email for QR label',
  })
  email!: string;
}