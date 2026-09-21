import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { Request, Response } from 'express';


@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let error = 'Internal Server Error';
    let details: unknown = null;

    // 1. Handle explicit RpcException
    if (exception instanceof RpcException) {
      const rpcError = exception.getError();
      if (typeof rpcError === 'object' && rpcError !== null) {
        // Safely extract status code - ensure it's a valid number
        const rpcErrorObj = rpcError as Record<string, unknown>;
        const rawStatus = rpcErrorObj.statusCode || rpcErrorObj.status;
        if (typeof rawStatus === 'number' && rawStatus >= 100 && rawStatus <= 599) {
          statusCode = rawStatus;
        } else {
          statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
        }
        message = String(rpcErrorObj.message || 'RPC Error');
        error = String(rpcErrorObj.error || 'RPC Error');
        details = rpcErrorObj.details || null;
      } else {
        statusCode = HttpStatus.BAD_REQUEST;
        message = typeof rpcError === 'string' ? rpcError : 'RPC Error';
      }
    }
    // 2. Handle standard Nest HttpException
    else if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const resp = exception.getResponse() as Record<string, unknown>;
      if (typeof resp === 'object') {
        message = Array.isArray(resp.message) ? resp.message[0] : resp.message || exception.message;
        error = String(resp.error || 'Identity Error');
        details = resp.details || null;
      } else {
        message = resp;
      }
    }
    // 3. Handle serialized errors from microservices (passed as generic objects)
    else if (exception && typeof exception === 'object') {
      const exc = exception as Record<string, any>;
      // Microservices often return { message, statusCode, error } or { response: { message, statusCode } }
      // Or sometimes they wrap it in { error: { statusCode, ... } }
      const rawStatus = exc.statusCode || 
                        exc.status || 
                        exc.response?.statusCode || 
                        exc.response?.status ||
                        exc.error?.statusCode ||
                        exc.error?.status;
      
      if (typeof rawStatus === 'number' && !isNaN(rawStatus) && rawStatus >= 100 && rawStatus <= 599) {
        statusCode = rawStatus;
      }
      
      const rawMessage = exc.message || exc.response?.message || exc.error?.message;
      message = Array.isArray(rawMessage) ? rawMessage[0] : rawMessage || message;
      
      const rawError = exc.error?.error || exc.error || exc.response?.error;
      error = typeof rawError === 'string' ? rawError : (statusCode === 500 ? 'Internal Server Error' : 'Microservice Error');
      
      details = exc.details || exc.response?.details || exc.error?.details || null;

      // Infer status from message when microservice dropped the HttpException status
      if (statusCode === HttpStatus.INTERNAL_SERVER_ERROR && typeof message === 'string') {
        const lower = message.toLowerCase();
        if (lower.includes('forbidden') || lower.includes('not allowed') || lower.includes('permission denied')) {
          statusCode = HttpStatus.FORBIDDEN;
          error = 'Forbidden';
        } else if (lower.includes('not found')) {
          statusCode = HttpStatus.NOT_FOUND;
          error = 'Not Found';
        } else if (lower.includes('unauthorized')) {
          statusCode = HttpStatus.UNAUTHORIZED;
          error = 'Unauthorized';
        }
      }
      
      // Handle connection errors
      if (exc.code === 'ECONNREFUSED' || exc.code === 'ECONNRESET' || exc.message?.includes('EAI_AGAIN')) {
         statusCode = HttpStatus.SERVICE_UNAVAILABLE;
         message = 'A downstream service is currently unavailable. Please try again later.';
         error = 'Service Unavailable';
      }
    }
    // 4. Handle string-based exceptions (common from some microservice configurations)
    else if (typeof exception === 'string') {
      message = exception;
      if (exception.toLowerCase().includes('forbidden') || exception.toLowerCase().includes('permission')) {
        statusCode = HttpStatus.FORBIDDEN;
        error = 'Forbidden';
      } else if (exception.toLowerCase().includes('unauthorized') || exception.toLowerCase().includes('token')) {
        statusCode = HttpStatus.UNAUTHORIZED;
        error = 'Unauthorized';
      } else if (exception.toLowerCase().includes('not found')) {
        statusCode = HttpStatus.NOT_FOUND;
        error = 'Not Found';
      } else if (exception.toLowerCase().includes('conflict') || exception.toLowerCase().includes('already exists') || exception.toLowerCase().includes('already enrolled')) {
        statusCode = HttpStatus.CONFLICT;
        error = 'Conflict';
      }
    }
    // 5. Handle generic Error objects
    else if (exception instanceof Error) {
      message = exception.message;
      const errorWithCode = exception as Error & { code?: string };
      if (errorWithCode.code === 'ECONNREFUSED') {
        statusCode = HttpStatus.SERVICE_UNAVAILABLE;
        message = 'Service connection failed.';
        error = 'Service Unavailable';
      }
    }

    // Logging
    const logMessage = `${request.method} ${request.url} - ${statusCode} - ${message}`;
    if (statusCode >= 500) {
      this.logger.error(logMessage);
      const excWithStack = exception as { stack?: string };
      if (excWithStack.stack) {
        this.logger.error(excWithStack.stack);
      } else if (typeof exception === 'object') {
        // Log the whole exception object if there's no stack trace
        console.error('[CRITICAL] Internal Error without stack trace:', exception);
      } else {
        console.error('[CRITICAL] Internal Error (Primitive Type):', exception);
      }
      
      /*
      // Security: Do not leak internal error messages for 500 errors to the client in production
      if (process.env.NODE_ENV === 'production') {
        message = 'An unexpected error occurred on our server. Our team has been notified.';
      }
      */
    } else {
      this.logger.warn(logMessage);
    }

    const isProduction = process.env.NODE_ENV === 'production';

    // Final response to client
    if (response && typeof response.status === 'function') {
      response.status(statusCode).json({
        statusCode,
        message,
        error,
        // Only provide details if not in production or if it's a non-sensitive validation error
        ...(!isProduction || error === 'Bad Request' ? { details } : {}),
        timestamp: new Date().toISOString(),
        path: request.url,
      });
    }
  }
}
