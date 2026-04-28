import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Throttle } from './decorators/throttle.decorator';

@ApiTags('cats')
@Throttle(1,10000)
@Controller('cats')
export class AppController {
  constructor(private readonly appService: AppService) {}
  @Get()
  @ApiOperation({ summary: 'Get all cats' })
  @ApiResponse({ status: 200, description: 'List of cats' })
  getHello(): string {
    console.log('HIT CONTROLLER');
    return this.appService.getHello();
  }
}
