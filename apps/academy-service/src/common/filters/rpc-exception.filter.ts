import {
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
  ExceptionFilter,
} from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { Prisma } from '@prisma/client/academy';
import { Observable, throwError } from 'rxjs';

@Catch()
export class RpcExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(RpcExceptionFilter.name);

  catch(exception: any, host: ArgumentsHost): Observable<any> {
    const exceptionName = exception?.constructor?.name || exception?.name || 'UnknownException';
    this.logger.log(`RpcExceptionFilter caught [${exceptionName}]: ${JSON.stringify(exception)}`);
    if (exception && exception.stack) this.logger.log(`Stack: ${exception.stack}`);

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let error = 'Internal Server Error';
    let details: any = null;

    // 1. Check for NestJS HttpException
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const response = exception.getResponse();
      if (typeof response === 'object') {
        const resObj = response as any;
        message = Array.isArray(resObj.message) ? resObj.message[0] : resObj.message || exception.message;
        error = resObj.error || 'Http Error';
        details = resObj.details || null;
      } else {
        message = response;
        error = exception.name || 'Http Error';
      }
    }
    // 2. Duck typing check for other common NestJS-like exceptions that might not be instances of HttpException
    else if (
      exception &&
      typeof exception.getStatus === 'function' &&
      typeof exception.getResponse === 'function'
    ) {
      status = exception.getStatus();
      const response = exception.getResponse();
      if (typeof response === 'object') {
        message = (response as any).message || exception.message;
        error = (response as any).error || 'Error';
      } else {
        message = response;
      }
    }
    // 2. Check for objects with explicit status properties
    else if (
      exception &&
      (exception.statusCode || exception.status) &&
      typeof (exception.statusCode || exception.status) === 'number'
    ) {
      const rawStatus = exception.statusCode || exception.status;
      if (rawStatus >= 100 && rawStatus <= 599) {
        status = rawStatus;
        message = exception.message || 'Error';
        error = 'Error';
      }
    }
    // 3. Prisma Known Errors
    else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      this.logger.error(
        `Prisma Known Error: ${exception.code} - ${exception.message}`,
      );
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
    // 4. Prisma Validation Errors
    else if (exception instanceof Prisma.PrismaClientValidationError) {
      this.logger.error(`Prisma Validation Error: ${exception.message}`);
      status = HttpStatus.BAD_REQUEST;
      message = 'Invalid data provided for database operation.';
      error = 'Validation Error';
      details = exception.message;
    }
    // 5. Prisma Initialization Errors
    else if (exception instanceof Prisma.PrismaClientInitializationError) {
      this.logger.error(`Prisma Initialization Error: ${exception.message}`);
      status = HttpStatus.SERVICE_UNAVAILABLE;
      message = 'Database connection failed.';
      error = 'Initialization Error';
    }
    // 6. RpcException
    else if (exception instanceof RpcException) {
      const rpcErr = exception.getError() as any;
      if (typeof rpcErr === 'object' && rpcErr !== null) {
        status = rpcErr.statusCode || rpcErr.status || HttpStatus.BAD_REQUEST;
        message = rpcErr.message || message;
        error = rpcErr.error || 'Bad Request';
        details = rpcErr.details || null;
      } else if (typeof rpcErr === 'string') {
        message = rpcErr;
        status = HttpStatus.BAD_REQUEST;
      }
      if (host && host.getType() !== 'http') {
        return throwError(() => exception.getError());
      }
    }
    // 7. Generic Error
    else if (exception instanceof Error) {
      message = exception.message;
      this.logger.error(`Unhandled error: ${message}`, exception.stack);
    }
    // 8. Catch-all
    else {
      console.error(
        '[CRITICAL] Academy Microservice hit a non-Error exception:',
        exception,
      );
      if (exception?.constructor)
        console.error('Constructor:', exception.constructor.name);
      console.dir(exception, { depth: null });
    }

    const errorResponse = {
      statusCode: status,
      message: message,
      error: error,
      ...(details && { details }),
      timestamp: new Date().toISOString(),
    };

    if (status >= 500) {
      this.logger.error(`Returning 500 error for [${exceptionName}]: ${JSON.stringify(errorResponse)}`);
    } else {
      this.logger.warn(`Handled Exception [${exceptionName}]: ${message} (Status: ${status})`);
    }

    if (host && host.getType() === 'http') {
      const ctx = host.switchToHttp();
      const response = ctx.getResponse();
      const request = ctx.getRequest();

      response.status(status).json({
        ...errorResponse,
        path: request?.url,
      });
      return;
    }

    return throwError(() => new RpcException(errorResponse));
  }
}
