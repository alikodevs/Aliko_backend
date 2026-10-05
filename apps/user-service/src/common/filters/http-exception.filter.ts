import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { Prisma } from '../../generated/client';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let error = 'Internal Server Error';
    let details: any = null;

    if (exception.constructor.name === 'RpcException') {
      const rpcError = exception.getError();
      if (typeof rpcError === 'object' && rpcError !== null) {
        status = rpcError.statusCode || rpcError.status || HttpStatus.BAD_REQUEST;
        message = rpcError.message || 'RPC Error';
        error = rpcError.error || 'RPC Error';
        details = rpcError.details || null;
      } else {
        status = HttpStatus.BAD_REQUEST;
        message = typeof rpcError === 'string' ? rpcError : 'RPC Error';
      }
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse() as any;
      if (typeof res === 'object') {
        message = Array.isArray(res.message) ? res.message[0] : res.message || exception.message;
        error = res.error || 'Http Error';
        details = res.details || null;
      } else {
        message = res;
        error = 'Http Error';
      }
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
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
          message = 'Database operation failed.';
          error = 'Database Error';
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    const errorResponse = {
      statusCode: status,
      message,
      error,
      ...(details && { details }),
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    if (status >= 500) {
      this.logger.error(`Fatal Error: ${JSON.stringify(errorResponse)}`, exception.stack);
    } else {
      this.logger.warn(`Handled Exception: ${message} (Status: ${status})`);
    }

    response.status(status).json(errorResponse);
  }
}
