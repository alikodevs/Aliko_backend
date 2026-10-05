export interface BackoffOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  factor?: number;
  jitter?: boolean;
}

export async function executeWithRetry<T>(
  fn: () => Promise<T>,
  options: BackoffOptions = {}
): Promise<T> {
  const maxRetries = options.maxRetries ?? 3;
  const initialDelay = options.initialDelayMs ?? 500;
  const maxDelay = options.maxDelayMs ?? 10000;
  const factor = options.factor ?? 2;
  const jitter = options.jitter ?? true;

  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (err) {
      attempt++;
      if (attempt > maxRetries) {
        throw err;
      }
      let delay = Math.min(initialDelay * Math.pow(factor, attempt - 1), maxDelay);
      if (jitter) {
        delay = Math.round(delay * (0.8 + Math.random() * 0.4));
      }
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}
