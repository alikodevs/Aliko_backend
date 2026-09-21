import { RpcExceptionFilter } from './rpc-exception.filter';
import { BadRequestException, ForbiddenException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { Prisma } from '../../generated/client';
import { firstValueFrom } from 'rxjs';

describe('RpcExceptionFilter', () => {
  let filter: RpcExceptionFilter;

  beforeEach(() => {
    filter = new RpcExceptionFilter();
  });

  it('handles HttpException like ForbiddenException and returns RpcException with statusCode 403', async () => {
    const host: any = {};
    const obs = filter.catch(new ForbiddenException('Access denied'), host);
    try {
      await firstValueFrom(obs);
      fail('Should have thrown RpcException');
    } catch (err: any) {
      expect(err).toBeInstanceOf(RpcException);
      const errorObj = err.getError();
      expect(errorObj.statusCode).toBe(403);
      expect(errorObj.message).toBe('Access denied');
    }
  });

  it('handles NotFoundException and returns statusCode 404', async () => {
    const host: any = {};
    const obs = filter.catch(new NotFoundException('Item not found'), host);
    try {
      await firstValueFrom(obs);
      fail('Should have thrown RpcException');
    } catch (err: any) {
      expect(err).toBeInstanceOf(RpcException);
      const errorObj = err.getError();
      expect(errorObj.statusCode).toBe(404);
      expect(errorObj.message).toBe('Item not found');
    }
  });

  it('handles Prisma P2002 Unique Constraint violation as Conflict 409', async () => {
    const host: any = {};
    const prismaError = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
      code: 'P2002',
      clientVersion: '6.15.0',
      meta: { target: ['slug'] },
    });
    const obs = filter.catch(prismaError, host);
    try {
      await firstValueFrom(obs);
      fail('Should have thrown RpcException');
    } catch (err: any) {
      expect(err).toBeInstanceOf(RpcException);
      const errorObj = err.getError();
      expect(errorObj.statusCode).toBe(409);
      expect(errorObj.message).toContain('Unique constraint violation');
    }
  });
});
