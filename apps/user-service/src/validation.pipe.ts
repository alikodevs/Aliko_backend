import { PipeTransform, Injectable, ArgumentMetadata, HttpStatus } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import * as Joi from 'joi';

@Injectable()
export class JoiValidationPipe implements PipeTransform {
  constructor(private schema: Joi.ObjectSchema) {}

  transform(value: any, metadata: ArgumentMetadata) {
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
