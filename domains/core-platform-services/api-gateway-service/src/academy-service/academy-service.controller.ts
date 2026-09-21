import {
  Controller,
  Post,
  Body,
  Inject,
  HttpCode,
  HttpStatus,
  UsePipes,
  HttpException,
  Logger,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, throwError, TimeoutError } from 'rxjs';
import { timeout, catchError } from 'rxjs/operators';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import * as Joi from 'joi';
import { JoiValidationPipe } from '../common/pipes/joi-validation.pipe';

@ApiTags('Academy Authentication')
@Controller('academy')
export class AcademyController {
  private readonly logger = new Logger(AcademyController.name);

  constructor(
    @Inject('ACADEMY_SERVICE') private readonly academyClient: ClientProxy,
  ) {}

  private handleError(error: any, operation: string) {
    this.logger.error(`${operation} failed:`, error);
    
    if (error instanceof TimeoutError) {
      throw new HttpException('Academy service timeout', HttpStatus.GATEWAY_TIMEOUT);
    }
    
    if (error.code === 'ECONNREFUSED') {
      throw new HttpException('Academy service unavailable', HttpStatus.SERVICE_UNAVAILABLE);
    }

    let status = HttpStatus.BAD_REQUEST;
    if (typeof error?.statusCode === 'number') {
      status = error.statusCode;
    } else if (typeof error?.status === 'number') {
      status = error.status;
    }

    const message = error?.message || 'Error from academy microservice';
    const errorType = error?.error || 'Microservice Error';

    throw new HttpException({
      statusCode: status,
      message,
      error: errorType,
      details: error?.details || error?.stack || null
    }, status);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset email under academy' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string', example: 'user@example.com' },
        frontendUrl: { type: 'string', example: 'https://lms.alikohub.com' },
      },
      required: ['email']
    }
  })
  @ApiResponse({ status: 200, description: 'Reset email sent if account exists' })
  @UsePipes(
    new JoiValidationPipe(
      Joi.object({
        email: Joi.string().email().required().trim(),
        frontendUrl: Joi.string().uri().optional(),
      }),
    ),
  )
  async forgotPassword(@Body() body: { email: string; frontendUrl?: string }) {
    this.logger.log(`Academy forgot-password request for email: ${body.email}`);
    return firstValueFrom(
      this.academyClient.send(
        { cmd: 'forgot_password' },
        { ...body, app: 'academy' },
      ).pipe(
        timeout(10000),
        catchError((error) => {
          this.handleError(error, 'Academy Forgot Password');
          return throwError(() => error);
        }),
      ),
    );
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update password using reset link token under academy' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
        newPassword: { type: 'string', example: 'NewSecurePassword123!' },
        email: { type: 'string', example: 'user@example.com' },
      },
      required: ['token', 'newPassword']
    }
  })
  @ApiResponse({ status: 200, description: 'Password reset successful' })
  @UsePipes(
    new JoiValidationPipe(
      Joi.object({
        token: Joi.string().required(),
        newPassword: Joi.string()
          .min(8)
          .regex(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/)
          .required(),
        email: Joi.string().email().optional().trim(),
      }),
    ),
  )
  async resetPassword(@Body() body: any) {
    this.logger.log(`Academy reset-password request`);
    return firstValueFrom(
      this.academyClient.send({ cmd: 'reset_password' }, body).pipe(
        timeout(10000),
        catchError((error) => {
          this.handleError(error, 'Academy Reset Password');
          return throwError(() => error);
        }),
      ),
    );
  }
}