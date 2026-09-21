import {
  utilities as nestWinstonModuleUtilities,
  WinstonModule,
} from 'nest-winston';
import * as winston from 'winston';

export function createWinstonLogger(serviceName: string) {
  return WinstonModule.createLogger({
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.ms(),
          process.env.NODE_ENV === 'production'
            ? winston.format.json()
            : nestWinstonModuleUtilities.format.nestLike(serviceName, {
                colors: true,
                prettyPrint: true,
              }),
        ),
      }),
    ],
  });
}
