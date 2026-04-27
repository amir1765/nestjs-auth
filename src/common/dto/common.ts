import {
  ApiProperty,
  ApiPropertyOptional,
  IntersectionType,
} from '@nestjs/swagger';
import { IsInt, Max } from 'class-validator';
import { Min } from 'class-validator';
import { IsOptional } from 'class-validator';
import { Type as NestType } from '@nestjs/common';
import { Type } from 'class-transformer';
export class ApiResponseDto<T> {
  @ApiProperty({
    description: 'Indicates if the request was successful',
    type: Boolean,
    example: true,
  })
  success!: boolean;

  @ApiProperty({
    description: 'Response payload',
  })
  data!: T;

  @ApiProperty({
    description: 'Message of the response',
    type: String,
    example: 'Success',
  })
  message?: string;
}
/**
 * Generic pagination DTO
 */
export class PaginatedDto<T> {
  @ApiProperty({
    description: 'The start cursor for pagination',
    example: 0,
    readOnly: true,
  })
  startCursor!: number;

  @ApiProperty({
    description: 'The end cursor for pagination',
    example: 10,
    readOnly: true,
  })
  endCursor!: number;

  @ApiProperty({
    description: 'Whether there is a next page',
    example: true,
    readOnly: true,
  })
  hasNextPage!: boolean;

  @ApiProperty({
    description: 'Whether there is a previous page',
    example: false,
    readOnly: true,
  })
  hasPreviousPage!: boolean;

  @ApiProperty({
    description: 'The total count of items',
    example: 100,
    readOnly: true,
  })
  count!: number;

  /**
   * Override in subclasses to provide precise item-type metadata for Swagger
   */
  items!: T[];
}

export class PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Number of items to return',
    type: Number,
    minimum: 1,
    maximum: 20,
    default: 10,
    example: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  limit: number = 10;

  @ApiPropertyOptional({
    description: 'Cursor for pagination',
    type: Number,
    example: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  cursor: number | null = null;

  // @ApiPropertyOptional({
  //   description: 'Direction to scroll',
  //   enum: ListScrollDirection,
  //   default: ListScrollDirection.DOWN,
  //   example: ListScrollDirection.DOWN,
  //   enumName: 'ListScrollDirection',
  // })
  // @IsEnum(ListScrollDirection)
  // scrollDirection: ListScrollDirection = ListScrollDirection.DOWN;
}

/**
 * Mixin to augment any DTO with pagination query properties
 */
export function WithPagination(): typeof PaginationQueryDto;
export function WithPagination<T extends NestType<any>>(
  dto: T,
): NestType<InstanceType<T> & PaginationQueryDto>;

export function WithPagination<T extends NestType<any>>(dto?: T) {
  return dto ? IntersectionType(dto, PaginationQueryDto) : PaginationQueryDto;
}
