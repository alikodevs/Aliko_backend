import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),

  API_GATEWAY_PORT: Joi.number().default(3000),
  USER_SERVICE_PORT: Joi.number().default(3001),
  ACADEMY_SERVICE_PORT: Joi.number().default(3002),
  CONTECH_SERVICE_PORT: Joi.number().default(3003),
  EVENTS_SERVICE_PORT: Joi.number().default(3004),
  CAREERS_SERVICE_PORT: Joi.number().default(3005),
  FINANCIAL_SERVICE_PORT: Joi.number().default(3006),
  COMMUNICATION_SERVICE_PORT: Joi.number().default(3007),
  STORAGE_SERVICE_PORT: Joi.number().default(3008),

  JWT_SECRET: Joi.string().default('aliko-secret-jwt-key-change-in-production'),
  JWT_EXPIRES_IN: Joi.string().default('7d'),
  JWT_REFRESH_SECRET: Joi.string().default('aliko-secret-jwt-refresh-key'),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('30d'),
  INTERNAL_SERVICE_SECRET: Joi.string().default('aliko-internal-secret-change-in-production'),

  DATABASE_URL_USER: Joi.string().default('postgresql://postgres:postgres@localhost:5432/user_db?schema=public'),
  DATABASE_URL_ACADEMY: Joi.string().default('postgresql://postgres:postgres@localhost:5432/academy_db?schema=public'),
  DATABASE_URL_CONTECH: Joi.string().default('postgresql://postgres:postgres@localhost:5432/contech_db?schema=public'),
  DATABASE_URL_EVENTS: Joi.string().default('postgresql://postgres:postgres@localhost:5432/events_db?schema=public'),
  DATABASE_URL_CAREERS: Joi.string().default('postgresql://postgres:postgres@localhost:5432/careers_db?schema=public'),
  DATABASE_URL_FINANCIAL: Joi.string().default('postgresql://postgres:postgres@localhost:5432/financial_db?schema=public'),
  DATABASE_URL_COMMUNICATION: Joi.string().default('postgresql://postgres:postgres@localhost:5432/communication_db?schema=public'),

  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().default(6379),

  RABBITMQ_URI: Joi.string().default('amqp://guest:guest@localhost:5672'),

  LOCAL_UPLOAD_DIR: Joi.string().default('./uploads'),

  SMTP_HOST: Joi.string().default('localhost'),
  SMTP_PORT: Joi.number().default(1025),
  SMTP_USER: Joi.string().allow('').optional(),
  SMTP_PASS: Joi.string().allow('').optional(),
  MAIL_FROM: Joi.string().default('noreply@alikohub.com'),
});
