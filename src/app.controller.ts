import { Body, Controller, Get, Post, UseInterceptors } from '@nestjs/common';
import { AppService } from './app.service';

import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Throttle } from './decorators/throttle.decorator';
import { Idempotent } from './common/idempotency/idempotency.decorator';
import { IdempotencyInterceptor } from './common/idempotency/idempotency.interceptor';

@ApiTags('cats')
@Throttle(5,10000)
@UseInterceptors(IdempotencyInterceptor)
@Controller('cats')
export class AppController {
  constructor(private readonly appService: AppService) {}
  @Idempotent("get-cat-ops")
  @Get()
  @ApiOperation({ summary: 'Get all cats' })
  @ApiResponse({ status: 200, description: 'List of cats' })
  getHello(): string {
    console.log('HIT CONTROLLER');
    return this.appService.getHello();
  }
  // 🔥 TEST IDEMPOTENCY HERE
  @Post('create')
  @Idempotent('create-cat')
  @ApiOperation({ summary: 'Create a cat (idempotent test)' })
  @ApiResponse({ status: 201, description: 'Cat created' })
  createCat(@Body() body: any) {
    console.log('POST HIT CONTROLLER');

    return {
      success: true,
      timestamp: Date.now(), // 👈 important to prove caching
      data: body,
    };
  }
}
