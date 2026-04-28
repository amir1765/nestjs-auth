import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { Observable, from, throwError } from 'rxjs';
import { switchMap, tap, catchError } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';

import { IdempotencyService } from './idempotency.service';
import { IDEMPOTENCY_KEY } from './idempotency.decorator';

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  private readonly logger = new Logger(IdempotencyInterceptor.name);

  constructor(
    private readonly service: IdempotencyService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const operation = this.reflector.get<string>(
      IDEMPOTENCY_KEY,
      context.getHandler(),
    );

    const request = context.switchToHttp().getRequest();
    const method = request.method;

    // Skip if not enabled OR GET request
    if (!operation || method === 'GET') {
      return next.handle();
    }
    //  Header normalization
    const key =
      request.headers['idempotency-key'] ||
      request.headers['Idempotency-Key'];

    if (!key || typeof key !== 'string') {
      throw new ConflictException('Missing Idempotency-Key header');
    }

    const userId = request.user?.id;
    const body = request.body;

    return from(
      this.service.handle({
        key,
        operation,
        body,
        userId,
      }),
    ).pipe(
      switchMap((result) => {
        // ✅ CACHE HIT
        if (result.type === 'cached') {
          this.logger.log(
            `Cache hit | key=${key} user=${userId ?? 'guest'} operation=${operation}`,
          );

          return from([result.response]);
        }

        // ✅ NEW REQUEST
        if (result.type === 'new') {
          console.log("requestHash");
          const requestHash = result.requestHash;
          console.log(requestHash);
            if(!requestHash) throw new ConflictException('Invalid idempotency state');
          this.logger.log(
            `New request | key=${key} user=${userId ?? 'guest'} operation=${operation}`,
          );

          return next.handle().pipe(
            tap(async (response) => {
              await this.service.success({
                key,
                userId,
                response,
                requestHash,
              });

              this.logger.log(
                `Stored success | key=${key} user=${userId ?? 'guest'}`,
              );
            }),
            catchError((err) => {
              this.logger.warn(
                `Request failed | key=${key} user=${userId ?? 'guest'}`,
              );

              return from(
                this.service.error({
                  key,
                  userId,
                }),
              ).pipe(
                switchMap(() => throwError(() => err)),
              );
            }),
          );
        }

        // ⛔ Safety fallback (should never happen)
        throw new ConflictException('Invalid idempotency state');
      }),
    );
  }
}