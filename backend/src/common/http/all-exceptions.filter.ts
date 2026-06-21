import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus
} from "@nestjs/common";
import { Response } from "express";
import { API_ERROR_CODES } from "../constants";

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
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

    response.status(status).json({
      success: false,
      error: {
        code: status >= 500 ? API_ERROR_CODES.INTERNAL_ERROR : API_ERROR_CODES.VALIDATION_ERROR,
        message,
        details: typeof errorResponse === "object" ? errorResponse : []
      }
    });
  }
}

