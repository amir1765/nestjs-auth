import {
  IsEmail,
  IsString,
  MinLength,
  IsOptional,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger'; // optional Swagger

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Str0ngP@ss' })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;

  @ApiProperty({ required: false, example: 'John Doe' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  fullName?: string;
}
