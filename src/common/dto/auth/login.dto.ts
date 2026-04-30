import { IsEmail, IsString, MinLength, IsOptional, IsNumber, IsIP } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Str0ngP@ss' })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiProperty({ example: '192.168.1.1' })
  @IsIP()
  ip!: string;

  @ApiPropertyOptional({ example: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' })
  @IsOptional()
  @IsString()
  userAgent?: string;

  @ApiPropertyOptional({ example: 'd41d8cd98f00b204e9800998ecf8427e' })
  @IsOptional()
  @IsString()
  fingerprint?: string;

  @ApiPropertyOptional({ example: 'US' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ example: 'New York' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: 40.7128 })
  @IsOptional()
  @IsNumber()
  lat?: number;

  @ApiPropertyOptional({ example: -74.006 })
  @IsOptional()
  @IsNumber()
  lon?: number;
}