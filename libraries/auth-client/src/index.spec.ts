import { ConfigService } from '@nestjs/config';
import { Transport } from '@nestjs/microservices';
import {
  AUTH_MESSAGE_PATTERNS,
  AUTH_SERVICE,
  createAuthClientAsync,
} from './index';

describe('@alikohub/auth-client', () => {
  it('exports stable service token and message patterns', () => {
    expect(AUTH_SERVICE).toBe('AUTH_SERVICE');
    expect(AUTH_MESSAGE_PATTERNS.GET_USER_PROFILE).toBe('get_user_profile');
    expect(AUTH_MESSAGE_PATTERNS.VALIDATE_TOKEN).toBe('validate_token');
  });

  it('createAuthClientAsync defaults to localhost:3011', () => {
    const entry = createAuthClientAsync();
    expect(entry.name).toBe(AUTH_SERVICE);

    const config = {
      get: jest.fn().mockReturnValue(undefined),
    } as unknown as ConfigService;

    const options = entry.useFactory(config);
    expect(options.transport).toBe(Transport.TCP);
    expect(options.options.host).toBe('localhost');
    expect(options.options.port).toBe(3011);
  });

  it('createAuthClientAsync reads AUTH_SERVICE_HOST and AUTH_TCP_PORT', () => {
    const entry = createAuthClientAsync();
    const config = {
      get: jest.fn((key: string) => {
        if (key === 'AUTH_SERVICE_HOST') return 'auth-service';
        if (key === 'AUTH_TCP_PORT') return '3011';
        return undefined;
      }),
    } as unknown as ConfigService;

    const options = entry.useFactory(config);
    expect(options.options.host).toBe('auth-service');
    expect(options.options.port).toBe(3011);
  });
});
