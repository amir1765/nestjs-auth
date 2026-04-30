// src/common/request-context/request-context.module.ts

import {
  Module,
  NestModule,
  MiddlewareConsumer,
  Global,
} from '@nestjs/common';
import { RequestContextService } from './request-context.service';
import { RequestContextMiddleware } from './request-context.middleware';

@Global() // ✅ THIS MAKES IT GLOBAL
@Module({
  providers: [RequestContextService, RequestContextMiddleware],
  exports: [RequestContextService],
})
export class RequestContextModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestContextMiddleware).forRoutes('*'); // ✅ global middleware
  }
}