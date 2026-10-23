import { Controller, UseGuards, UsePipes, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { CurriculumCrosswalkService } from './curriculum-crosswalk.service';
import { AddTextbookDto, AssignReadingDto } from './dto';
import { AuthenticatedUser } from '../user/user.service';
import { AcademyProfileGuard } from '../auth/academy-profile.guard';
import { RoleGuard } from '../auth/role-guard/role-guard';
import { Roles } from '../auth/role-guard/roles.decorator';
import { JoiValidationPipe } from '../common/pipes/joi-validation.pipe';
import {
  AddTextbookSchema,
  CourseIdTextbookSchema,
  AssignReadingSchema,
  LessonIdReadingSchema,
} from './curriculum-crosswalk.validation';

@Controller()
@UseGuards(AcademyProfileGuard)
export class CurriculumCrosswalkController {
  private readonly logger = new Logger(CurriculumCrosswalkController.name);

  constructor(
    private readonly crosswalkService: CurriculumCrosswalkService,
  ) {}

  @MessagePattern({ cmd: 'add_course_textbook' })
  @UseGuards(RoleGuard)
  @Roles('INSTRUCTOR', 'ADMIN')
  @UsePipes(new JoiValidationPipe(AddTextbookSchema))
  async addTextbook(
    @Payload()
    payload: {
      dto: AddTextbookDto;
      user: AuthenticatedUser;
    },
  ) {
    return this.crosswalkService.addTextbook(payload.dto, payload.user);
  }

  @MessagePattern({ cmd: 'get_course_textbooks' })
  @UsePipes(new JoiValidationPipe(CourseIdTextbookSchema))
  async getTextbooks(
    @Payload()
    payload: {
      courseId: number;
      user: AuthenticatedUser;
    },
  ) {
    return this.crosswalkService.getTextbooksByCourse(
      payload.courseId,
      payload.user,
    );
  }

  @MessagePattern({ cmd: 'assign_lesson_reading' })
  @UseGuards(RoleGuard)
  @Roles('INSTRUCTOR', 'ADMIN')
  @UsePipes(new JoiValidationPipe(AssignReadingSchema))
  async assignReading(
    @Payload()
    payload: {
      dto: AssignReadingDto;
      user: AuthenticatedUser;
    },
  ) {
    return this.crosswalkService.assignReading(payload.dto, payload.user);
  }

  @MessagePattern({ cmd: 'get_lesson_readings' })
  @UsePipes(new JoiValidationPipe(LessonIdReadingSchema))
  async getReadings(
    @Payload()
    payload: {
      lessonId: number;
      user: AuthenticatedUser;
    },
  ) {
    return this.crosswalkService.getReadingsByLesson(
      payload.lessonId,
      payload.user,
    );
  }

  @MessagePattern({ cmd: 'get_course_curriculum_crosswalk' })
  @UsePipes(new JoiValidationPipe(CourseIdTextbookSchema))
  async getCrosswalk(
    @Payload()
    payload: {
      courseId: number;
      user: AuthenticatedUser;
    },
  ) {
    return this.crosswalkService.generateCourseCrosswalk(
      payload.courseId,
      payload.user,
    );
  }
}
