import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor
} from "@nestjs/common";
import { map, Observable } from "rxjs";

type ApiEnvelope<T> = {
  success: true;
  data: T;
  message: string;
};

@Injectable()
export class ApiResponseInterceptor<T> implements NestInterceptor<T, ApiEnvelope<T>> {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<ApiEnvelope<T>> {
    return next.handle().pipe(
      map((payload: T | { data?: T; message?: string }) => {
        if (
          payload &&
          typeof payload === "object" &&
          "data" in payload &&
          "message" in payload
        ) {
          const typed = payload as { data: T; message: string };
          return { success: true, data: typed.data, message: typed.message };
        }

        return { success: true, data: payload as T, message: "OK" };
      })
    );
  }
}

