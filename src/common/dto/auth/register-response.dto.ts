import { IsString, IsEmail, IsBoolean, IsNumber, IsISO8601, ValidateIf } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterResponseDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'John Doe', nullable: true })
  @ValidateIf((o) => o.fullName !== null)
  @IsString()
  fullName!: string | null;

  @ApiProperty({ example: 'clx2v3k9a0000uhg8ncti0pqy' })
  @IsString()
  id!: string;


  @ApiProperty({ example: 'https://cdn.example.com/avatars/123.jpg', nullable: true })
  @ValidateIf((o) => o.avatarUrl !== null)
  @IsString()
  avatarUrl!: string | null;

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z', type: String, format: 'date-time' })
  @IsISO8601()
  createdAt!: Date;

}