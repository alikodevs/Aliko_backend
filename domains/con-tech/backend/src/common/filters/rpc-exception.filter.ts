import {
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
  ExceptionFilter,
} from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { Prisma } from '@prisma/client';
import { Observable, throwError } from 'rxjs';

/**
 * Centralized exception filter for Microservices.
 * Catches all errors and transforms them into a standardized RpcException object
 * that the API Gateway can properly deserialize.
 */
@Catch()
export class RpcExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(RpcExceptionFilter.name);

  catch(exception: unknown, _host: ArgumentsHost): Observable<any> {
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let error = 'Internal Server Error';
    let details: Record<string, unknown> | null = null;

    // 1. Handle Nest HTTP Exceptions (e.g. ForbiddenException, NotFoundException)
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const response = exception.getResponse();

      if (typeof response === 'object' && response !== null) {
        const resObj = response as Record<string, unknown>;
        message = Array.isArray(resObj.message)
          ? String(resObj.message[0])
          : String(resObj.message || exception.message);
        error = String(resObj.error || 'Http Error');
        details = (resObj.details as Record<string, unknown>) || null;
      } else {
        message = String(response);
        error = 'Http Error';
      }
    }
    // 2. Handle Prisma Client Errors (Database)
    else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      this.logger.error(
        `Prisma Error [${exception.code}]: ${exception.message}`,
      );

      switch (exception.code) {
        case 'P2002': {
          // Unique constraint violation
          status = HttpStatus.CONFLICT;
          const target = (exception.meta?.target as string[])?.join(', ');
          message = `Unique constraint violation. A record with this ${target || 'field'} already exists.`;
          error = 'Conflict';
          break;
        }
        case 'P2025': // Record not found
          status = HttpStatus.NOT_FOUND;
          message = 'The requested record was not found.';
          error = 'Not Found';
          break;
        default:
          status = HttpStatus.BAD_REQUEST;
          message = 'Database operation failed.';
          error = 'Database Error';
          details = { code: exception.code };
      }
    }
    // 3. Handle Prisma Validation Errors
    else if (exception instanceof Prisma.PrismaClientValidationError) {
      status = HttpStatus.BAD_REQUEST;
      message = 'Invalid data format provided to database.';
      error = 'Validation Error';
    }
    // 4. Handle Existing RpcException (don't wrap twice)
    else if (exception instanceof RpcException) {
      return throwError(() => exception.getError());
    }
    // 5. Handle standard Error objects
    else if (exception instanceof Error) {
      message = exception.message;
      this.logger.error(`Unhandled error: ${message}`, exception.stack);
    } else {
      this.logger.error('Unknown error type caught in filter:', exception);
    }

    const errorResponse = {
      statusCode: status,
      message: message,
      error: error,
      ...(details && { details }),
      timestamp: new Date().toISOString(),
    };

    // Log the error for debugging
    if (status >= (HttpStatus.INTERNAL_SERVER_ERROR as number)) {
      this.logger.error(`Fatal Error: ${JSON.stringify(errorResponse)}`);
    } else {
      this.logger.warn(`Handled Exception: ${message} (Status: ${status})`);
    }

    // Return the formatted error as an RpcException
    return throwError(() => new RpcException(errorResponse));
  }
}
