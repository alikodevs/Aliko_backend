import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { AppLoggerService } from './logger.service';
import { Request, Response } from 'express';
import { green, blue, yellow, red, magenta, cyan, gray, bold } from 'colorette';

function sanitizePayload(payload: any): any {
  if (!payload || typeof payload !== 'object') return payload;
  const clone = Array.isArray(payload) ? [...payload] : { ...payload };
  const sensitiveKeys = ['password', 'confirmPassword', 'token', 'refreshToken', 'secret', 'apiKey', 'card_number', 'cvv'];
  
  for (const key of Object.keys(clone)) {
    if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
      clone[key] = '***REDACTED***';
    } else if (typeof clone[key] === 'object') {
      clone[key] = sanitizePayload(clone[key]);
    }
  }
  return clone;
}

function colorMethod(method: string): string {
  switch (method.toUpperCase()) {
    case 'GET': return green(method);
    case 'POST': return blue(method);
    case 'PATCH': return yellow(method);
    case 'PUT': return magenta(method);
    case 'DELETE': return red(method);
    default: return cyan(method);
  }
}

function colorStatus(status: number): string {
  if (status >= 500) return bold(red(`[${status}]`));
  if (status >= 400) return bold(yellow(`[${status}]`));
  if (status >= 300) return bold(cyan(`[${status}]`));
  return bold(green(`[${status}]`));
}

@Injectable()
export class HttpLoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: AppLoggerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();

    if (!req || !req.method) {
      return next.handle();
    }

    const start = Date.now();
    const { method, originalUrl, body } = req;
    const url = originalUrl || req.url;

    if (url.includes('/metrics') || url.includes('/health')) {
      return next.handle();
    }

    const hasBody = body && Object.keys(body).length > 0;
    const sanitized = hasBody ? sanitizePayload(body) : null;
    const bodyStr = sanitized ? ` | Body: ${JSON.stringify(sanitized)}` : '';
    this.logger.log(`📥 INCOMING ${colorMethod(method)} ${cyan(url)}${gray(bodyStr)}`, 'HTTP');

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - start;
        const statusCode = res?.statusCode || 200;
        this.logger.log(
          `📤 RESPONSE ${colorMethod(method)} ${cyan(url)} -> ${colorStatus(statusCode)} ${cyan(`(${duration}ms)`)}`,
          'HTTP'
        );
      }),
      catchError((error) => {
        const duration = Date.now() - start;
        const statusCode =
          error instanceof HttpException
            ? error.getStatus()
            : HttpStatus.INTERNAL_SERVER_ERROR;
        this.logger.warn(
          `⚠️ ERROR ${colorMethod(method)} ${cyan(url)} -> ${colorStatus(statusCode)} ${cyan(`(${duration}ms)`)} | Message: ${error?.message || error}`,
          'HTTP'
        );
        return throwError(() => error);
      })
    );
  }
}
