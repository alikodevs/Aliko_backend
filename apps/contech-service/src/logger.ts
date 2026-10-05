import { LoggerService } from '@nestjs/common';
import * as winston from 'winston';

const { combine, timestamp, printf, colorize } = winston.format;

const customFormat = printf(({ level, message, timestamp }) => {
  return `[${String(timestamp)}] ${String(level)}: ${String(message)}`;
});

export const winstonLogger = winston.createLogger({
  level: 'info',
  format: combine(
    colorize(),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    customFormat,
  ),
  transports: [new winston.transports.Console()],
});

export class AppLogger implements LoggerService {
  log(message: string) {
    winstonLogger.info(message);
  }
  error(message: string, trace?: string) {
    winstonLogger.error(`${message} - ${trace}`);
  }
  warn(message: string) {
    winstonLogger.warn(message);
  }
  debug?(message: string) {
    winstonLogger.debug(message);
  }
  verbose?(message: string) {
    winstonLogger.verbose(message);
  }
}
