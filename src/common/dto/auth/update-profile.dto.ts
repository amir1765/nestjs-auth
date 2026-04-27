import { IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'John Doe' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  fullName?: string;

  @ApiPropertyOptional({ example: 'https://example.com/avatar.jpg' })
  @IsOptional()
  @IsString()
  @IsUrl()
  avatarUrl?: string;
}
