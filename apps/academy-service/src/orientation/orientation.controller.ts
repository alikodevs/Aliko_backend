import {
  Controller,
  UseGuards,
  UsePipes,
  Logger,
  Get,
  Post,
  Param,
  Body,
  Req,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { OrientationService } from './orientation.service';
import { CompleteOrientationDto } from './dto/complete-orientation.dto';
import { AuthenticatedUser } from '../user/user.service';
import { AcademyProfileGuard } from '../auth/academy-profile.guard';
import { JoiValidationPipe } from '../common/pipes/joi-validation.pipe';
import {
  CompleteOrientationSchema,
  OrientationStatusSchema,
} from './orientation.validation';

@Controller()
@UseGuards(AcademyProfileGuard)
export class OrientationController {
  private readonly logger = new Logger(OrientationController.name);

  constructor(private readonly orientationService: OrientationService) {}

  @Post(['orientation/complete', 'academy/orientation/complete'])
  @MessagePattern({ cmd: 'complete_orientation' })
  @UsePipes(new JoiValidationPipe(CompleteOrientationSchema))
  async completeOrientation(
    @Body() body?: CompleteOrientationDto,
    @Req() req?: any,
    @Payload()
    payload?: {
      dto: CompleteOrientationDto;
      user: AuthenticatedUser;
    },
  ) {
    const dto = payload?.dto || body;
    const user = payload?.user || req?.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    if (!dto) {
      throw new BadRequestException('Orientation completion data required');
    }
    return this.orientationService.completeOrientation(dto, user);
  }

  @Get(['orientation/status/:cohortId', 'academy/orientation/status/:cohortId'])
  @MessagePattern({ cmd: 'get_orientation_status' })
  @UsePipes(new JoiValidationPipe(OrientationStatusSchema))
  async getOrientationStatus(
    @Param('cohortId') paramCohortId?: string,
    @Req() req?: any,
    @Payload()
    payload?: {
      cohortId: number;
      user: AuthenticatedUser;
    },
  ) {
    const rawCohortId = payload?.cohortId !== undefined ? payload.cohortId : paramCohortId;
    const cohortId = Number(rawCohortId);
    if (!cohortId || isNaN(cohortId)) {
      throw new BadRequestException('Valid cohort ID required');
    }
    const user = payload?.user || req?.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    return this.orientationService.getOrientationStatus(
      cohortId,
      user,
    );
  }
}
