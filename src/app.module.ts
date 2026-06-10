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
import { RequestContextModule } from './common/request-context/request-context.module';
import { MailModule } from './common/mail/mail.module';
import { TwoFAModule } from './api/auth-twofa/twofa.module';
import { EmailOTPTokenService } from './api/email-otp-token/email-otp-token.service';
import { EmailOtpTokenModule } from './api/email-otp-token/email-otp-token.module';
import { RbacModule } from './api/auth-rbac/rbac.module';

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
    //db req  handler
    PrismaModule,
    RepositoriesModule,
    RedisModule,
    RedisStorageModule,
    //core
    AuthModule,
    RbacModule,
    TwoFAModule,
    EmailOtpTokenModule,
    //common folder for isolated sys which is independent to actual logic but can help the core
    IdempotencyModule,
    RequestContextModule,
    MailModule
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
