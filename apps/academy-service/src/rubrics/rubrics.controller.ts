import {
  Controller,
  UseGuards,
  UsePipes,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Req,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { RubricsService } from './rubrics.service';
import {
  CreateRubricDto,
  UpdateRubricDto,
  ListRubricsDto,
  CloneRubricDto,
  EvaluateWithRubricDto,
} from './dto';
import {
  createRubricSchema,
  updateRubricSchema,
  listRubricsSchema,
  cloneRubricSchema,
  evaluateWithRubricSchema,
} from './rubrics.validation';
import { JoiValidationPipe } from '../common/pipes/joi-validation.pipe';
import { AcademyProfileGuard } from '../auth/academy-profile.guard';
import { RoleGuard } from '../auth/role-guard/role-guard';
import { Roles } from '../auth/role-guard/roles.decorator';
import { AcademyRole } from '@prisma/client/academy';
import { AuthenticatedUser } from '../user/user.service';

@Controller()
@UseGuards(AcademyProfileGuard, RoleGuard)
export class RubricsController {
  constructor(private readonly rubricsService: RubricsService) {}

  @Post(['rubrics', 'academy/rubrics'])
  @MessagePattern('create_rubric')
  @Roles(AcademyRole.INSTRUCTOR, AcademyRole.COURSE_MANAGER, AcademyRole.ADMIN)
  @UsePipes(new JoiValidationPipe(createRubricSchema))
  async create(
    @Body() body?: CreateRubricDto,
    @Req() req?: any,
    @Payload() payload?: { dto: CreateRubricDto; user: AuthenticatedUser },
  ) {
    const dto = payload?.dto || (body as any)?.dto || body;
    const user = payload?.user || req?.user || (body as any)?.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    const userId = user.firebaseId || user.userId || user.id;
    if (!dto) {
      throw new BadRequestException('Rubric data is required');
    }
    return this.rubricsService.create(userId, dto);
  }

  @Get(['rubrics', 'academy/rubrics'])
  @MessagePattern('get_rubrics')
  @UsePipes(new JoiValidationPipe(listRubricsSchema))
  async findAll(
    @Query() query?: any,
    @Req() req?: any,
    @Payload() payload?: { dto: ListRubricsDto; user: AuthenticatedUser },
  ) {
    const rawDto = payload?.dto || query || {};
    const dto: ListRubricsDto = {
      ...rawDto,
      isActive:
        rawDto.isActive === 'true'
          ? true
          : rawDto.isActive === 'false'
          ? false
          : rawDto.isActive,
      page: rawDto.page ? Number(rawDto.page) : undefined,
      limit: rawDto.limit ? Number(rawDto.limit) : undefined,
    };
    return this.rubricsService.findAll(dto);
  }

  @Get(['rubrics/:id', 'academy/rubrics/:id'])
  @MessagePattern('get_rubric_by_id')
  async findOne(
    @Param('id') paramId?: string,
    @Req() req?: any,
    @Payload() payload?: { id: string; user: AuthenticatedUser },
  ) {
    const id = payload?.id || paramId;
    if (!id) {
      throw new BadRequestException('Rubric ID is required');
    }
    return this.rubricsService.findOne(id);
  }

  @Put(['rubrics/:id', 'academy/rubrics/:id'])
  @Patch(['rubrics/:id', 'academy/rubrics/:id'])
  @MessagePattern('update_rubric')
  @Roles(AcademyRole.INSTRUCTOR, AcademyRole.COURSE_MANAGER, AcademyRole.ADMIN)
  @UsePipes(new JoiValidationPipe(updateRubricSchema))
  async update(
    @Param('id') paramId?: string,
    @Body() body?: UpdateRubricDto,
    @Req() req?: any,
    @Payload() payload?: { dto: UpdateRubricDto; user: AuthenticatedUser },
  ) {
    const user = payload?.user || req?.user || (body as any)?.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    const userId = user.firebaseId || user.userId || user.id;
    const id = paramId || payload?.dto?.id || (body as any)?.id || (body as any)?.dto?.id;
    const rawDto = payload?.dto || (body as any)?.dto || body;
    const dto: UpdateRubricDto = { ...rawDto, id };
    if (!dto.id) {
      throw new BadRequestException('Rubric ID is required');
    }
    return this.rubricsService.update(userId, dto);
  }

  @Delete(['rubrics/:id', 'academy/rubrics/:id'])
  @MessagePattern('delete_rubric')
  @Roles(AcademyRole.INSTRUCTOR, AcademyRole.COURSE_MANAGER, AcademyRole.ADMIN)
  async remove(
    @Param('id') paramId?: string,
    @Req() req?: any,
    @Payload() payload?: { id: string; user: AuthenticatedUser },
  ) {
    const id = payload?.id || (paramId as any)?.id || paramId;
    if (!id) {
      throw new BadRequestException('Rubric ID is required');
    }
    return this.rubricsService.remove(id);
  }

  @Post(['rubrics/:id/clone', 'academy/rubrics/:id/clone'])
  @MessagePattern('clone_rubric')
  @Roles(AcademyRole.INSTRUCTOR, AcademyRole.COURSE_MANAGER, AcademyRole.ADMIN)
  @UsePipes(new JoiValidationPipe(cloneRubricSchema))
  async clone(
    @Param('id') paramId?: string,
    @Body() body?: CloneRubricDto,
    @Req() req?: any,
    @Payload() payload?: { dto: CloneRubricDto; user: AuthenticatedUser },
  ) {
    const user = payload?.user || req?.user || (body as any)?.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    const userId = user.firebaseId || user.userId || user.id;
    const rubricId =
      paramId ||
      payload?.dto?.rubricId ||
      (body as any)?.rubricId ||
      (body as any)?.dto?.rubricId;
    if (!rubricId) {
      throw new BadRequestException('Rubric ID is required');
    }
    const newName =
      payload?.dto?.newName ||
      (body as any)?.newName ||
      (body as any)?.dto?.newName;
    return this.rubricsService.clone(userId, { rubricId, newName });
  }

  @Post(['rubrics/evaluate', 'academy/rubrics/evaluate'])
  @MessagePattern('evaluate_with_rubric')
  @Roles(AcademyRole.INSTRUCTOR, AcademyRole.COURSE_MANAGER, AcademyRole.ADMIN)
  @UsePipes(new JoiValidationPipe(evaluateWithRubricSchema))
  async evaluateWithRubric(
    @Body() body?: EvaluateWithRubricDto,
    @Req() req?: any,
    @Payload() payload?: { dto: EvaluateWithRubricDto; user: AuthenticatedUser },
  ) {
    const dto = payload?.dto || (body as any)?.dto || body;
    if (!dto || !dto.rubricId) {
      throw new BadRequestException('Evaluation data and rubricId are required');
    }
    return this.rubricsService.evaluateWithRubric(dto);
  }
}

export default RubricsController;
