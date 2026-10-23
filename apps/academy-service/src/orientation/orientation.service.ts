import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedUser, UserService } from '../user/user.service';
import { CompleteOrientationDto } from './dto/complete-orientation.dto';

@Injectable()
export class OrientationService {
  private readonly logger = new Logger(OrientationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly userService: UserService,
  ) {}

  async completeOrientation(
    dto: CompleteOrientationDto,
    user: AuthenticatedUser,
  ) {
    await this.userService.getOrCreateProfile(user);

    const application = await this.prisma.studentAdmissionsApplication.upsert({
      where: {
        userId_cohortId: {
          userId: user.firebaseId,
          cohortId: dto.cohortId,
        },
      },
      update: {
        orientationCompleted: true,
        orientationAttendedAt: new Date(),
        lmsTutorialCompleted: true,
        netiquetteSigned: true,
        updatedAt: new Date(),
      },
      create: {
        userId: user.firebaseId,
        cohortId: dto.cohortId,
        orientationCompleted: true,
        orientationAttendedAt: new Date(),
        lmsTutorialCompleted: true,
        netiquetteSigned: true,
      },
    });

    this.logger.log(
      `Student ${user.firebaseId} completed mandatory orientation for cohort ${dto.cohortId}. Note: Orientation hours are non-credit under WAC 246-841A-440 (Req 11).`,
    );

    return application;
  }

  async getOrientationStatus(cohortId: number, user: AuthenticatedUser) {
    await this.userService.getOrCreateProfile(user);

    const application = await this.prisma.studentAdmissionsApplication.findUnique({
      where: {
        userId_cohortId: {
          userId: user.firebaseId,
          cohortId,
        },
      },
    });

    return {
      cohortId,
      userId: user.firebaseId,
      orientationCompleted: application?.orientationCompleted ?? false,
      orientationAttendedAt: application?.orientationAttendedAt ?? null,
      lmsTutorialCompleted: application?.lmsTutorialCompleted ?? false,
      netiquetteSigned: application?.netiquetteSigned ?? false,
      isCreditHour: false, // WABON explicit zero-credit flag
    };
  }

  async isOrientationCompleted(cohortId: number, userId: string): Promise<boolean> {
    const application = await this.prisma.studentAdmissionsApplication.findUnique({
      where: {
        userId_cohortId: {
          userId,
          cohortId,
        },
      },
    });

    return application?.orientationCompleted ?? false;
  }
}
