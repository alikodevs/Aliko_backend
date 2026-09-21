import { ConfigModule, ConfigService } from '@nestjs/config';
import { Transport } from '@nestjs/microservices';

export const AUTH_SERVICE = 'AUTH_SERVICE';

export const AUTH_MESSAGE_PATTERNS = {
  GET_USER_PROFILE: 'get_user_profile',
  VALIDATE_TOKEN: 'validate_token',
  LOGIN: 'login',
  REGISTER: 'register',
} as const;

/** Nest ClientsModule.registerAsync entry (loosely typed for Nest 10/11 compatibility). */
export function createAuthClientAsync(name: string = AUTH_SERVICE): any {
  return {
    name,
    imports: [ConfigModule],
    inject: [ConfigService],
    useFactory: (configService: ConfigService) => ({
      transport: Transport.TCP,
      options: {
        host: configService.get('AUTH_SERVICE_HOST') || 'localhost',
        port: Number(configService.get('AUTH_TCP_PORT')) || 3011,
      },
    }),
  };
}
