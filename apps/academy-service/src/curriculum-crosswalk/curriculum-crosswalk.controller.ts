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

  @Post(['curriculum-crosswalk/textbooks', 'academy/curriculum-crosswalk/textbooks'])
  @MessagePattern({ cmd: 'add_course_textbook' })
  @UseGuards(RoleGuard)
  @Roles('INSTRUCTOR', 'ADMIN')
  @UsePipes(new JoiValidationPipe(AddTextbookSchema))
  async addTextbook(
    @Body() body?: AddTextbookDto,
    @Req() req?: any,
    @Payload()
    payload?: {
      dto: AddTextbookDto;
      user: AuthenticatedUser;
    },
  ) {
    const dto = payload?.dto || body;
    const user = payload?.user || req?.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    if (!dto) {
      throw new BadRequestException('Textbook data is required');
    }
    return this.crosswalkService.addTextbook(dto, user);
  }

  @Get(['curriculum-crosswalk/textbooks/course/:courseId', 'academy/curriculum-crosswalk/textbooks/course/:courseId'])
  @MessagePattern({ cmd: 'get_course_textbooks' })
  @UsePipes(new JoiValidationPipe(CourseIdTextbookSchema))
  async getTextbooks(
    @Param('courseId') paramCourseId?: string,
    @Req() req?: any,
    @Payload()
    payload?: {
      courseId: number;
      user: AuthenticatedUser;
    },
  ) {
    const rawCourseId = payload?.courseId !== undefined ? payload.courseId : paramCourseId;
    const courseId = Number(rawCourseId);
    if (!courseId || isNaN(courseId)) {
      throw new BadRequestException('Invalid course ID');
    }
    const user = payload?.user || req?.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    return this.crosswalkService.getTextbooksByCourse(courseId, user);
  }

  @Post(['curriculum-crosswalk/readings', 'academy/curriculum-crosswalk/readings'])
  @MessagePattern({ cmd: 'assign_lesson_reading' })
  @UseGuards(RoleGuard)
  @Roles('INSTRUCTOR', 'ADMIN')
  @UsePipes(new JoiValidationPipe(AssignReadingSchema))
  async assignReading(
    @Body() body?: AssignReadingDto,
    @Req() req?: any,
    @Payload()
    payload?: {
      dto: AssignReadingDto;
      user: AuthenticatedUser;
    },
  ) {
    const dto = payload?.dto || body;
    const user = payload?.user || req?.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    if (!dto) {
      throw new BadRequestException('Reading assignment data is required');
    }
    return this.crosswalkService.assignReading(dto, user);
  }

  @Get(['curriculum-crosswalk/readings/lesson/:lessonId', 'academy/curriculum-crosswalk/readings/lesson/:lessonId'])
  @MessagePattern({ cmd: 'get_lesson_readings' })
  @UsePipes(new JoiValidationPipe(LessonIdReadingSchema))
  async getReadings(
    @Param('lessonId') paramLessonId?: string,
    @Req() req?: any,
    @Payload()
    payload?: {
      lessonId: number;
      user: AuthenticatedUser;
    },
  ) {
    const rawLessonId = payload?.lessonId !== undefined ? payload.lessonId : paramLessonId;
    const lessonId = Number(rawLessonId);
    if (!lessonId || isNaN(lessonId)) {
      throw new BadRequestException('Invalid lesson ID');
    }
    const user = payload?.user || req?.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    return this.crosswalkService.getReadingsByLesson(lessonId, user);
  }

  @Get(['curriculum-crosswalk/matrix/course/:courseId', 'academy/curriculum-crosswalk/matrix/course/:courseId'])
  @MessagePattern({ cmd: 'get_course_curriculum_crosswalk' })
  @UsePipes(new JoiValidationPipe(CourseIdTextbookSchema))
  async getCrosswalk(
    @Param('courseId') paramCourseId?: string,
    @Req() req?: any,
    @Payload()
    payload?: {
      courseId: number;
      user: AuthenticatedUser;
    },
  ) {
    const rawCourseId = payload?.courseId !== undefined ? payload.courseId : paramCourseId;
    const courseId = Number(rawCourseId);
    if (!courseId || isNaN(courseId)) {
      throw new BadRequestException('Invalid course ID');
    }
    const user = payload?.user || req?.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    return this.crosswalkService.generateCourseCrosswalk(courseId, user);
  }
}
