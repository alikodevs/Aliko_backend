import { JoiValidationPipe } from './validation.pipe';
import { RpcException } from '@nestjs/microservices';
import * as Joi from 'joi';

describe('JoiValidationPipe', () => {
  const schema = Joi.object({
    id: Joi.string().required(),
    count: Joi.number().min(1).required(),
  });

  const pipe = new JoiValidationPipe(schema);

  it('validates and strips unknown fields', () => {
    const validData = { id: '123', count: 5, unknownField: 'strip-me' };
    const result = pipe.transform(validData, {} as any);
    expect(result).toEqual({ id: '123', count: 5 });
  });

  it('throws RpcException with BAD_REQUEST when validation fails', () => {
    const invalidData = { id: '', count: 0 };
    expect(() => pipe.transform(invalidData, {} as any)).toThrow(RpcException);
  });
});
