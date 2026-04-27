import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Str0ngP@ss' })
  @IsString()
  @MinLength(1) // could be empty? No
  password!: string;
}
