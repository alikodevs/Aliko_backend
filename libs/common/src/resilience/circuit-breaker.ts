import { Logger } from '@nestjs/common';

export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

export interface CircuitBreakerOptions {
  name: string;
  failureThreshold?: number;
  resetTimeoutMs?: number;
  fallback?: (error: any) => any;
}

export class CircuitBreakerOpenException extends Error {
  constructor(name: string, nextAttemptInMs: number) {
    super(`Circuit breaker for [${name}] is OPEN. Fast-failing request. Next probe in ${Math.round(nextAttemptInMs / 1000)}s.`);
    this.name = 'CircuitBreakerOpenException';
  }
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime = 0;
  private readonly name: string;
  private readonly failureThreshold: number;
  private readonly resetTimeoutMs: number;
  private readonly fallback?: (error: any) => any;
  private readonly logger: Logger;

  constructor(options: CircuitBreakerOptions) {
    this.name = options.name;
    this.failureThreshold = options.failureThreshold ?? 4;
    this.resetTimeoutMs = options.resetTimeoutMs ?? 15000;
    this.fallback = options.fallback;
    this.logger = new Logger(`CircuitBreaker:${this.name}`);
  }

  getState(): CircuitState {
    this.evaluateState();
    return this.state;
  }

  getMetrics() {
    return {
      name: this.name,
      state: this.getState(),
      failureCount: this.failureCount,
      failureThreshold: this.failureThreshold,
      lastFailureTime: this.lastFailureTime ? new Date(this.lastFailureTime).toISOString() : null,
    };
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.evaluateState();

    if (this.state === CircuitState.OPEN) {
      const nextAttempt = this.lastFailureTime + this.resetTimeoutMs - Date.now();
      this.logger.warn(`Fast-failing execution for [${this.name}]. Next retry attempt in ${Math.max(0, Math.round(nextAttempt / 1000))}s.`);

      if (this.fallback) {
        return this.fallback(new CircuitBreakerOpenException(this.name, nextAttempt));
      }
      throw new CircuitBreakerOpenException(this.name, nextAttempt);
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error);
      if (this.fallback) {
        return this.fallback(error);
      }
      throw error;
    }
  }

  private evaluateState() {
    if (this.state === CircuitState.OPEN) {
      const now = Date.now();
      if (now - this.lastFailureTime >= this.resetTimeoutMs) {
        this.state = CircuitState.HALF_OPEN;
        this.logger.log(`State transition: OPEN -> HALF_OPEN. Probing downstream service...`);
      }
    }
  }

  private onSuccess() {
    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= 2) {
        this.state = CircuitState.CLOSED;
        this.failureCount = 0;
        this.successCount = 0;
        this.logger.log(`State transition: HALF_OPEN -> CLOSED. Service has recovered.`);
      }
    } else {
      this.failureCount = 0;
    }
  }

  private onFailure(error: any) {
    this.lastFailureTime = Date.now();
    this.failureCount++;
    this.logger.warn(`Failure count: ${this.failureCount}/${this.failureThreshold} (Error: ${error?.message || error})`);

    if (this.state === CircuitState.HALF_OPEN || this.failureCount >= this.failureThreshold) {
      this.state = CircuitState.OPEN;
      this.logger.error(`State transition: ${this.state} -> OPEN. Tripped circuit breaker for [${this.name}].`);
    }
  }
}
