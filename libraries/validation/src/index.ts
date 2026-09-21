import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
} from '@nestjs/common';
import { ObjectSchema } from 'joi';

@Injectable()
export class JoiValidationPipe implements PipeTransform {
  constructor(private schema: ObjectSchema) {}

  transform(value: unknown, _metadata: ArgumentMetadata) {
    const { error, value: validated } = this.schema.validate(value, {
      abortEarly: false,
      stripUnknown: true,
    });
    if (error) {
      throw new BadRequestException(
        error.details.map((d) => d.message).join('; '),
      );
    }
    return validated;
  }
}
