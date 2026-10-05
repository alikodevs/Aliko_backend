import { PipeTransform, Injectable, ArgumentMetadata, BadRequestException } from '@nestjs/common';
import * as Joi from 'joi';

@Injectable()
export class JoiValidationPipe implements PipeTransform {
  constructor(private schema: Joi.ObjectSchema) {}

  transform(value: any, metadata: ArgumentMetadata) {
    if (metadata.type !== 'body') return value; // Only validate body

    const { error } = this.schema.validate(value, { allowUnknown: true });
    if (error) {
      throw new BadRequestException(`Validation failed: ${error.message}`);
    }
    return value;
  }
}
