import {
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
  ExceptionFilter,
} from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { Prisma } from '../../generated/client';
import { Observable, throwError } from 'rxjs';

/**
 * Centralized exception filter for Auth Microservice.
 */
@Catch()
export class RpcExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(RpcExceptionFilter.name);

  catch(exception: any, host: ArgumentsHost): Observable<any> {
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let error = 'Internal Server Error';
    let details: any = null;

    // 1. Check for HttpException (duck typing + constructor check + name check)
    if (
      exception &&
      (exception instanceof HttpException ||
        (typeof exception.getStatus === 'function' &&
          typeof exception.getResponse === 'function') ||
        exception.constructor?.name === 'ForbiddenException' ||
        exception.constructor?.name === 'UnauthorizedException' ||
        exception.constructor?.name === 'NotFoundException' ||
        exception.constructor?.name === 'BadRequestException' ||
        (exception as any).name === 'ForbiddenException' ||
        (exception as any).name === 'NotFoundException' ||
        (exception as any).message?.includes('Unauthorized') ||
        (exception as any).message?.includes('Forbidden'))
    ) {
      status =
        typeof exception.getStatus === 'function'
          ? exception.getStatus()
          : exception.constructor?.name === 'ForbiddenException' ||
              (exception as any).name === 'ForbiddenException' ||
              (exception as any).message?.includes('Forbidden') ||
              (exception as any).message?.includes('permission')
            ? 403
            : exception.constructor?.name === 'UnauthorizedException' ||
                (exception as any).name === 'UnauthorizedException' ||
                (exception as any).message?.includes('Unauthorized')
              ? 401
              : exception.constructor?.name === 'NotFoundException' ||
                  (exception as any).name === 'NotFoundException'
                ? 404
                : 400;

      const response =
        typeof exception.getResponse === 'function'
          ? exception.getResponse()
          : exception.message;
      if (typeof response === 'object') {
        message = Array.isArray(response.message) ? response.message[0] : response.message || exception.message;
        error = response.error || 'Http Error';
        details = response.details || null;
      } else {
        message = response;
        error = 'Http Error';
      }
    }
    else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      this.logger.error(`Prisma Known Error: ${exception.code} - ${exception.message}`);
      switch (exception.code) {
        case 'P2002':
          status = HttpStatus.CONFLICT;
          const target = (exception.meta?.target as string[])?.join(', ');
          message = `Unique constraint violation: ${target || 'field'} already exists.`;
          error = 'Conflict';
          break;
        case 'P2025':
          status = HttpStatus.NOT_FOUND;
          message = 'The requested record was not found.';
          error = 'Not Found';
          break;
        default:
          status = HttpStatus.BAD_REQUEST;
          message = `Database operation failed: ${exception.code}`;
          error = 'Database Error';
      }
    }
    else if (exception instanceof Prisma.PrismaClientValidationError) {
      this.logger.error(`Prisma Validation Error: ${exception.message}`);
      status = HttpStatus.BAD_REQUEST;
      message = 'Invalid data provided for database operation.';
      error = 'Validation Error';
      details = exception.message;
    }
    else if (exception instanceof Prisma.PrismaClientInitializationError) {
      this.logger.error(`Prisma Initialization Error: ${exception.message}`);
      status = HttpStatus.SERVICE_UNAVAILABLE;
      message = 'Database connection failed.';
      error = 'Initialization Error';
    }
    else if (exception instanceof RpcException) {
      return throwError(() => exception.getError());
    }
    else if (exception instanceof Error) {
      message = exception.message;
      this.logger.error(`Unhandled error: ${message}`, exception.stack);
    } 

    const errorResponse = {
      statusCode: status,
      message: message,
      error: error,
      ...(details && { details }),
      timestamp: new Date().toISOString(),
    };

    if (status >= 500) {
      this.logger.error(`Fatal Error: ${JSON.stringify(errorResponse)}`);
    } else {
      this.logger.warn(`Handled Exception: ${message} (Status: ${status})`);
    }

    if (host.getType() === 'http') {
      const ctx = host.switchToHttp();
      const response = ctx.getResponse();
      const request = ctx.getRequest();

      response.status(status).json({
        ...errorResponse,
        path: request.url,
      });
      return; 
    }

    return throwError(() => new RpcException(errorResponse));
  }
}
