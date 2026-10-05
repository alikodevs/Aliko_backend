import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiResponse } from './api-response.dto';

@Catch()
export class GlobalHttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalHttpExceptionFilter.name);

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorCode = 'INTERNAL_SERVER_ERROR';
    let message = 'An unexpected error occurred. Please try again later.';
    let errorDetails: any = null;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
        errorCode = this.deriveErrorCode(status, message);
      } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const resp = exceptionResponse as Record<string, any>;
        message = Array.isArray(resp.message)
          ? resp.message.join('; ')
          : resp.message || exception.message || 'Request failed';
        errorCode = resp.code || resp.error || this.deriveErrorCode(status, message);
        errorDetails = resp.details || resp.errors || (Array.isArray(resp.message) ? resp.message : null);
      } else {
        message = exception.message || 'Request failed';
        errorCode = this.deriveErrorCode(status, message);
      }
    } else if (exception && typeof exception === 'object') {
      // Handle Prisma Database Exceptions cleanly
      if (exception.code === 'P2002') {
        status = HttpStatus.CONFLICT;
        const target = Array.isArray(exception.meta?.target)
          ? exception.meta.target.join(', ')
          : String(exception.meta?.target || '');

        if (target.includes('email')) {
          errorCode = 'EMAIL_ALREADY_EXISTS';
          message = 'An account with this email address already exists. Please log in or reset your password.';
        } else if (target.includes('phone')) {
          errorCode = 'PHONE_ALREADY_EXISTS';
          message = 'An account with this phone number already exists.';
        } else {
          errorCode = 'DUPLICATE_RECORD';
          message = `A record with this ${target || 'unique field'} already exists.`;
        }
      } else if (exception.code === 'P2025') {
        status = HttpStatus.NOT_FOUND;
        errorCode = 'RECORD_NOT_FOUND';
        message = exception.meta?.cause || 'The requested resource was not found.';
      } else {
        this.logger.error(
          `Unhandled Exception on ${request?.method} ${request?.url}: ${exception?.message || exception}`,
          exception?.stack
        );
        message = exception?.message || message;
      }
    }

    if (status >= 500) {
      this.logger.error(
        `[500 Internal Error] ${request?.method} ${request?.url} - ${message}`,
        exception?.stack
      );
    }

    if (response && typeof response.status === 'function') {
      response.status(status).json(
        ApiResponse.fail(message, {
          code: errorCode,
          statusCode: status,
          details: errorDetails,
          path: request?.url,
        })
      );
    }
  }

  private deriveErrorCode(status: number, message: string): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return 'BAD_REQUEST';
      case HttpStatus.UNAUTHORIZED:
        return 'UNAUTHORIZED';
      case HttpStatus.FORBIDDEN:
        return 'FORBIDDEN';
      case HttpStatus.NOT_FOUND:
        return 'NOT_FOUND';
      case HttpStatus.CONFLICT:
        return 'CONFLICT';
      case HttpStatus.UNPROCESSABLE_ENTITY:
        return 'UNPROCESSABLE_ENTITY';
      case HttpStatus.TOO_MANY_REQUESTS:
        return 'RATE_LIMIT_EXCEEDED';
      default:
        return 'INTERNAL_SERVER_ERROR';
    }
  }
}
