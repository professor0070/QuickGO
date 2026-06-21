import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus
} from "@nestjs/common";
import { API_ERROR_CODES } from "../constants";

type HttpResponse = {
  code?: (statusCode: number) => HttpResponse;
  status?: (statusCode: number) => HttpResponse;
  send?: (body: unknown) => void;
  json?: (body: unknown) => void;
};

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<HttpResponse>();
    const status = exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const errorResponse = exception instanceof HttpException
      ? exception.getResponse()
      : undefined;
    const message = typeof errorResponse === "object" && errorResponse && "message" in errorResponse
      ? String((errorResponse as { message: unknown }).message)
      : exception instanceof Error
        ? exception.message
        : "Internal server error";

    const body = {
      success: false,
      error: {
        code: this.errorCode(status, errorResponse),
        message,
        details: typeof errorResponse === "object" ? errorResponse : []
      }
    };

    this.send(response, status, body);
  }

  private send(response: HttpResponse, status: number, body: unknown) {
    const responder = response.status?.(status) ?? response.code?.(status) ?? response;

    if (typeof responder.json === "function") {
      responder.json(body);
      return;
    }

    responder.send?.(body);
  }

  private errorCode(status: number, errorResponse: string | object | undefined) {
    if (
      errorResponse &&
      typeof errorResponse === "object" &&
      "code" in errorResponse &&
      typeof (errorResponse as { code?: unknown }).code === "string"
    ) {
      return (errorResponse as { code: string }).code;
    }

    if (status === HttpStatus.UNAUTHORIZED) {
      return API_ERROR_CODES.UNAUTHORIZED;
    }
    if (status === HttpStatus.FORBIDDEN) {
      return API_ERROR_CODES.FORBIDDEN;
    }
    if (status === HttpStatus.NOT_FOUND) {
      return API_ERROR_CODES.NOT_FOUND;
    }
    if (status === HttpStatus.TOO_MANY_REQUESTS) {
      return API_ERROR_CODES.RATE_LIMITED;
    }

    return status >= 500 ? API_ERROR_CODES.INTERNAL_ERROR : API_ERROR_CODES.VALIDATION_ERROR;
  }
}
