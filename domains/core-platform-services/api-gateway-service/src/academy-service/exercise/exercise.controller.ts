import { Controller, Get, Post, Body, Patch, Param, Delete, Inject, UseGuards, Request, HttpStatus, HttpException, Logger, Query } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { firstValueFrom, timeout, catchError, throwError } from 'rxjs';
import { AuthGuard } from '../../common/guard/firebase_auth.guard';
import { CreateExerciseDto } from './dto/create-exercise.dto';
import { UpdateExerciseDto, SubmitExerciseDto, GradeExerciseDto } from './dto/update-exercise.dto';

@ApiTags('Academy - Exercises')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('academy/exercises')
export class ExercisesController {
  private readonly logger = new Logger(ExercisesController.name);

  constructor(@Inject('ACADEMY_SERVICE') private academyClient: ClientProxy) {}

  private handleError(error: any, operation: string) {
    this.logger.error(`${operation} failed:`, error);
    // Ensure we get a valid numeric status code
    const rawStatus = error.statusCode || error.status;
    const status = (typeof rawStatus === 'number' && rawStatus >= 100 && rawStatus <= 599)
      ? rawStatus
      : HttpStatus.INTERNAL_SERVER_ERROR;
    const message = error.message || 'Error communicating with Academy service';
    throw new HttpException({ statusCode: status, message, error: error.error || 'Academy Service Error' }, status);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new exercise' })
  async create(@Request() req: any, @Body() dto: CreateExerciseDto) {
    return firstValueFrom(
      this.academyClient.send({ cmd: 'create_exercise' }, { dto, user: req.user }).pipe(
        timeout(10000),
        catchError(error => {
          this.handleError(error, 'Create Exercise');
          return throwError(() => error);
        }),
      )
    );
  }

  @Post('bulk')
  @ApiOperation({ summary: 'Create multiple exercises at once' })
  async createBulk(@Request() req: any, @Body('dtos') dtos: CreateExerciseDto[]) {
    return firstValueFrom(
      this.academyClient.send({ cmd: 'create_bulk_exercises' }, { dtos, user: req.user }).pipe(
        timeout(15000),
        catchError(error => {
          this.handleError(error, 'Bulk Create Exercises');
          return throwError(() => error);
        }),
      )
    );
  }

  @Get('module/:moduleId')
  @ApiOperation({ summary: 'Find all exercises in a module' })
  async findAllByModule(@Request() req: any, @Param('moduleId') moduleId: string, @Query() query: any) {
    return firstValueFrom(
      this.academyClient.send({ cmd: 'find_exercises_by_module' }, { moduleId: +moduleId, user: req.user, query }).pipe(
        timeout(10000),
        catchError(error => {
          this.handleError(error, 'Find Exercises by Module');
          return throwError(() => error);
        }),
      )
    );
  }

  @Get('instructor/my')
  @ApiOperation({ summary: 'Find all exercises for current instructor' })
  async getMyExercises(@Request() req: any, @Query() query: any) {
    return firstValueFrom(
      this.academyClient.send({ cmd: 'find_instructor_exercises' }, { user: req.user, query }).pipe(
        timeout(10000),
        catchError(error => {
          this.handleError(error, 'Find My Exercises');
          return throwError(() => error);
        }),
      )
    );
  }

  @Get('instructor/submissions')
  @ApiOperation({ summary: 'Find all submissions for instructor (Grading Inbox)' })
  async getInstructorSubmissions(@Request() req: any, @Query() query: any) {
    return firstValueFrom(
      this.academyClient.send({ cmd: 'find_instructor_submissions' }, { user: req.user, query }).pipe(
        timeout(10000),
        catchError(error => {
          this.handleError(error, 'Find Instructor Submissions');
          return throwError(() => error);
        }),
      )
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get exercise by ID' })
  async findOne(@Request() req: any, @Param('id') id: string) {
    return firstValueFrom(
      this.academyClient.send({ cmd: 'find_exercise_by_id' }, { id: +id, user: req.user }).pipe(
        timeout(10000),
        catchError(error => {
          this.handleError(error, 'Find Exercise');
          return throwError(() => error);
        }),
      )
    );
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an exercise' })
  async update(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateExerciseDto) {
    return firstValueFrom(
      this.academyClient.send({ cmd: 'update_exercise' }, { id: +id, dto, user: req.user }).pipe(
        timeout(10000),
        catchError(error => {
          this.handleError(error, 'Update Exercise');
          return throwError(() => error);
        }),
      )
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an exercise' })
  async remove(@Request() req: any, @Param('id') id: string) {
    return firstValueFrom(
      this.academyClient.send({ cmd: 'remove_exercise' }, { id: +id, user: req.user }).pipe(
        timeout(10000),
        catchError(error => {
          this.handleError(error, 'Remove Exercise');
          return throwError(() => error);
        }),
      )
    );
  }

  @Post(':id/submit')
  @ApiOperation({ summary: 'Submit an answer to an exercise' })
  async submit(@Request() req: any, @Param('id') id: string, @Body() dto: SubmitExerciseDto) {
    return firstValueFrom(
      this.academyClient.send({ cmd: 'submit_exercise' }, { id: +id, dto, user: req.user }).pipe(
        timeout(10000),
        catchError(error => {
          this.handleError(error, 'Submit Exercise');
          return throwError(() => error);
        }),
      )
    );
  }

  @Post('submissions/:id/grade')
  @ApiOperation({ summary: 'Grade an exercise submission (Instructor/Admin)' })
  async grade(@Request() req: any, @Param('id') id: string, @Body() dto: GradeExerciseDto) {
    return firstValueFrom(
      this.academyClient.send({ cmd: 'grade_exercise' }, { id: +id, dto, user: req.user }).pipe(
        timeout(10000),
        catchError(error => {
          this.handleError(error, 'Grade Exercise');
          return throwError(() => error);
        }),
      )
    );
  }
}
