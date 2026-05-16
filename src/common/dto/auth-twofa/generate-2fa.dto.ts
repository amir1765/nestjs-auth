import { ApiProperty } from '@nestjs/swagger';

export class Generate2FADto {

  @ApiProperty({
    example: 'user@email.com',
    description: 'User email for QR label',
  })
  email!: string;
}