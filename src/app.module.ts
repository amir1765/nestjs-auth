import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './repositories/prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { ConfigModule } from '@nestjs/config';
import configuration from './common/config/configuration';
import { envSchema } from './common/config/env.schema';
import { RepositoriesModule } from './repositories/repositories.module';
import { ThrottlerModule } from '@nestjs/throttler';
import {AdvancedRateLimitGuard } from './guards/throttler.guard';
import { APP_GUARD } from '@nestjs/core';
import { RedisStorageModule,  } from './redis/redis-storage.module';
import { IdempotencyModule } from './common/idempotency/idempotency.module';
import { AuthModule } from './api/auth/auth.module';
import { JwtService } from '@nestjs/jwt';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate: (env) => envSchema.parse(env),
    }),
    // SentryModule.forRoot(),
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 60,
          limit: 10,
        },
      ],
    }),
    PrismaModule,
    RepositoriesModule,
    RedisModule,
    RedisStorageModule,
    IdempotencyModule,
    AuthModule
  ],
  controllers: [AppController],
  providers: [
  {
    provide: APP_GUARD,
    useClass: AdvancedRateLimitGuard,
  },
    AppService,
  ],
})
export class AppModule {}
