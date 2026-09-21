import { HttpException } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';

/**
 * Convert any thrown exception into an RpcException that preserves
 * HTTP status + message.
 *
 * Nest microservice transports do NOT reliably apply HTTP exception
 * filters — unrecognised errors are serialized as generic
 * `{ status: 'error', message: 'Internal server error' }`, which the
 * API gateway surfaces as HTTP 500.
 */
export function toRpcException(error: unknown): RpcException {
  if (error instanceof RpcException) return error;

  const err = error as {
    message?: string;
    name?: string;
    getStatus?: () => number;
    getResponse?: () => string | Record<string, unknown>;
  };

  const statusCode =
    error instanceof HttpException
      ? error.getStatus()
      : typeof err?.getStatus === 'function'
        ? err.getStatus()
        : 500;

  let message = err?.message || 'Internal server error';
  let errorName = 'Internal Server Error';

  if (error instanceof HttpException || typeof err?.getResponse === 'function') {
    const response = error instanceof HttpException
      ? error.getResponse()
      : err.getResponse!();
    if (typeof response === 'object' && response !== null) {
      const res = response as Record<string, unknown>;
      const rawMessage = res.message;
      message = Array.isArray(rawMessage)
        ? String(rawMessage[0])
        : String(rawMessage || message);
      errorName = String(res.error || err.name || errorName);
    } else if (typeof response === 'string') {
      message = response;
    }
  }

  return new RpcException({
    statusCode,
    message,
    error: errorName,
    timestamp: new Date().toISOString(),
  });
}
