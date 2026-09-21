/**
 * Shared utilities for AlikoHub services.
 */
export function assertEnv(name, value) {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function createHttpClientProxy(baseUrl) {
  return {
    baseUrl,
    async get(path, options = {}) {
      const res = await fetch(`${baseUrl}${path}`, { ...options, method: 'GET' });
      return res.json();
    },
    async post(path, body, options = {}) {
      const res = await fetch(`${baseUrl}${path}`, {
        ...options,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {}),
        },
        body: JSON.stringify(body),
      });
      return res.json();
    },
  };
}
