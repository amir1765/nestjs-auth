import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsBoolean, IsNumber, IsEmail, IsISO8601 } from 'class-validator';
import { Type } from 'class-transformer';

export class UserDto {
  @ApiProperty({ example: 'clx2v3k9a0000uhg8ncti0pqy' })
  @IsString()
  id!: string;

  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'John Doe', nullable: true })
  fullName!: string | null;

  @ApiProperty({
    example: 'https://cdn.example.com/avatars/123.jpg',
    nullable: true,
  })
  avatarUrl!: string | null;

  @ApiProperty({
    example: '2025-01-01T00:00:00.000Z',
    type: String,
    format: 'date-time',
  })
  @IsISO8601()
  createdAt!: Date;
}


export class LoginResponseDto {
  @ApiProperty({ type: UserDto })
  @Type(() => UserDto)
  user!: UserDto;

  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIs...' })
  @IsString()
  accessToken!: string;
}