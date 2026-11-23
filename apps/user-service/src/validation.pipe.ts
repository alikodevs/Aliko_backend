import { PipeTransform, Injectable, ArgumentMetadata, HttpStatus } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import * as Joi from 'joi';

@Injectable()
export class JoiValidationPipe implements PipeTransform {
  constructor(private schema: Joi.Schema) {}

  transform(value: any, metadata?: ArgumentMetadata) {
    if (value === undefined || value === null) {
      return value;
    }

    // Skip primitive route params / query params if schema expects complex object
    if (metadata?.type === 'param' || metadata?.type === 'query') {
      if (typeof value !== 'object') {
        return value;
      }
    }

    // In TCP microservice requests, @Body() receives {} while the actual data is in @Payload()
    if (metadata?.type === 'body' && typeof value === 'object' && Object.keys(value).length === 0) {
      return value;
    }

    const { error, value: validatedValue } = this.schema.validate(value, {
      abortEarly: false,
      stripUnknown: true,
    });
    
    if (error) {
      const messages = error.details.map(d => d.message).join(', ');
      throw new RpcException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: `Validation failed: ${messages}`,
        error: 'Bad Request',
      });
    }
    
    return validatedValue;
  }
}
