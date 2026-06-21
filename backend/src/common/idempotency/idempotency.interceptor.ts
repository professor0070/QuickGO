import {
  BadRequestException,
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Request } from "express";
import { catchError, from, mergeMap, Observable, of, throwError } from "rxjs";
import { API_ERROR_CODES } from "../constants";
import { IDEMPOTENT_ACTION_KEY, IdempotentAction } from "./idempotent.decorator";
import { IdempotencyService } from "./idempotency.service";

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly idempotency: IdempotencyService
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const action = this.reflector.getAllAndOverride<IdempotentAction>(
      IDEMPOTENT_ACTION_KEY,
      [context.getHandler(), context.getClass()]
    );

    if (!action) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<Request>();
    const rawKey = request.headers["idempotency-key"];
    const idempotencyKey = Array.isArray(rawKey) ? rawKey[0] : rawKey;

    if (!idempotencyKey) {
      throw new BadRequestException({
        code: API_ERROR_CODES.VALIDATION_ERROR,
        message: `Idempotency-Key header is required for ${action}`
      });
    }

    const scopedKey = `${action}:${idempotencyKey}`;
    return from(this.idempotency.begin(scopedKey)).pipe(
      mergeMap((cached) => {
        if (cached !== undefined) {
          return of(cached);
        }

        return next.handle().pipe(
          mergeMap(async (body) => {
            await this.idempotency.complete(scopedKey, body);
            return body;
          }),
          catchError((error: unknown) =>
            from(this.idempotency.fail(scopedKey)).pipe(
              mergeMap(() => throwError(() => error))
            )
          )
        );
      })
    );
  }
}
