import { IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';


export class LogoutSessionDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Session identifier to terminate',
  })
  @IsUUID()
  sessionId!: string;
}

export class LogoutAllSessionsDto {
  @ApiProperty({
    example: 'clx2v3k9a0000uhg8ncti0pqy',
    description: 'User whose sessions should all be invalidated',
  })
  @IsString()
  userId!: string;
}