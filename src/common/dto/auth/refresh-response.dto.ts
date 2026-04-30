import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
export class RefreshResponseDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIs...', description: 'Newly issued access token' })
  @IsString()
  accessToken!: string;

  @ApiProperty({ example: 'dGhpcyBpcyBhIHJlZnJl...', description: 'Newly issued refresh token' })
  @IsString()
  refreshToken!: string;
}