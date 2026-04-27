import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('cats')
@Controller('cats')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: 'Get all cats' })
  @ApiResponse({ status: 200, description: 'List of cats' })
  getHello(): string {
    return this.appService.getHello();
  }
}
