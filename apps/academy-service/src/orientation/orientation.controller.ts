import { Controller, UseGuards, UsePipes, Logger } from '@nestjs/common';
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

  @MessagePattern({ cmd: 'complete_orientation' })
  @UsePipes(new JoiValidationPipe(CompleteOrientationSchema))
  async completeOrientation(
    @Payload()
    payload: {
      dto: CompleteOrientationDto;
      user: AuthenticatedUser;
    },
  ) {
    return this.orientationService.completeOrientation(
      payload.dto,
      payload.user,
    );
  }

  @MessagePattern({ cmd: 'get_orientation_status' })
  @UsePipes(new JoiValidationPipe(OrientationStatusSchema))
  async getOrientationStatus(
    @Payload()
    payload: {
      cohortId: number;
      user: AuthenticatedUser;
    },
  ) {
    return this.orientationService.getOrientationStatus(
      payload.cohortId,
      payload.user,
    );
  }
}
