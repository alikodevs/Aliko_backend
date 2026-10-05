export * from './decorators';
export * from './jwt.strategy';
export * from './jwt-auth.guard';
export * from './roles.guard';
export * from './auth.module';

export const AUTH_SERVICE = 'AUTH_SERVICE';
export function createAuthClientAsync(name: string = AUTH_SERVICE): any {
  return {
    name,
    useFactory: () => ({
      options: { host: 'localhost', port: 3011 },
    }),
  };
}
