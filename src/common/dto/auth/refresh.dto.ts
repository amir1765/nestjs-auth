import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
export class RefreshDto {
  @ApiProperty({ example: 'dGhpcyBpcyBhIHJlZnJl...', description: 'Current refresh token' })
  @IsString()
  refreshToken!: string;
}