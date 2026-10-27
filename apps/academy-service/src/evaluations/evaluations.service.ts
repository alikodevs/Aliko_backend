import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SubmitSurveyDto, GetCohortSurveysDto } from './dto';

@Injectable()
export class EvaluationsService {
  constructor(private readonly prisma: PrismaService) {}

  async submitSurvey(userId: string, dto: SubmitSurveyDto) {
    const enrollment = await this.prisma.enrollment.findFirst({
      where: {
        userId,
        cohortId: dto.cohortId,
      },
    });

    if (!enrollment) {
      throw new BadRequestException('You are not enrolled in this cohort to submit an evaluation');
    }

    const existing = await this.prisma.courseEvaluationSurvey.findFirst({
      where: {
        userId,
        cohortId: dto.cohortId,
      },
    });

    if (existing) {
      return this.prisma.courseEvaluationSurvey.update({
        where: { id: existing.id },
        data: {
          courseRating: dto.courseRating,
          platformRating: dto.platformRating,
          instructorRating: dto.instructorRating,
          comments: dto.comments,
          submittedAt: new Date(),
        },
      });
    }

    return this.prisma.courseEvaluationSurvey.create({
      data: {
        userId,
        cohortId: dto.cohortId,
        courseRating: dto.courseRating,
        platformRating: dto.platformRating,
        instructorRating: dto.instructorRating,
        comments: dto.comments,
      },
    });
  }

  async getMySurvey(userId: string, cohortId: number) {
    const survey = await this.prisma.courseEvaluationSurvey.findFirst({
      where: {
        userId,
        cohortId,
      },
    });

    if (!survey) {
      throw new NotFoundException('No evaluation survey found for this cohort');
    }

    return survey;
  }

  async getCohortSurveys(dto: GetCohortSurveysDto) {
    const surveys = await this.prisma.courseEvaluationSurvey.findMany({
      where: { cohortId: dto.cohortId },
      include: {
        student: {
          select: {
            userId: true,
            role: true,
          },
        },
      },
      orderBy: { submittedAt: 'desc' },
    });

    const count = surveys.length;
    if (count === 0) {
      return {
        cohortId: dto.cohortId,
        totalSurveys: 0,
        averageCourseRating: 0,
        averagePlatformRating: 0,
        averageInstructorRating: 0,
        surveys: [],
      };
    }

    const sumCourse = surveys.reduce((acc, s) => acc + s.courseRating, 0);
    const sumPlatform = surveys.reduce((acc, s) => acc + s.platformRating, 0);
    const sumInstructor = surveys.reduce((acc, s) => acc + s.instructorRating, 0);

    return {
      cohortId: dto.cohortId,
      totalSurveys: count,
      averageCourseRating: parseFloat((sumCourse / count).toFixed(2)),
      averagePlatformRating: parseFloat((sumPlatform / count).toFixed(2)),
      averageInstructorRating: parseFloat((sumInstructor / count).toFixed(2)),
      surveys,
    };
  }
}
