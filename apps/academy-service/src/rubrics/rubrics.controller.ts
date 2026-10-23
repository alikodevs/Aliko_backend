import { Controller, UseGuards, UsePipes } from '@nestjs/common';
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

  @MessagePattern('create_rubric')
  @Roles(AcademyRole.INSTRUCTOR, AcademyRole.COURSE_MANAGER, AcademyRole.ADMIN)
  @UsePipes(new JoiValidationPipe(createRubricSchema))
  async create(
    @Payload() payload: { dto: CreateRubricDto; user: AuthenticatedUser },
  ) {
    return this.rubricsService.create(payload.user.firebaseId, payload.dto);
  }

  @MessagePattern('get_rubrics')
  @UsePipes(new JoiValidationPipe(listRubricsSchema))
  async findAll(
    @Payload() payload: { dto: ListRubricsDto; user: AuthenticatedUser },
  ) {
    return this.rubricsService.findAll(payload.dto);
  }

  @MessagePattern('get_rubric_by_id')
  async findOne(
    @Payload() payload: { id: string; user: AuthenticatedUser },
  ) {
    return this.rubricsService.findOne(payload.id);
  }

  @MessagePattern('update_rubric')
  @Roles(AcademyRole.INSTRUCTOR, AcademyRole.COURSE_MANAGER, AcademyRole.ADMIN)
  @UsePipes(new JoiValidationPipe(updateRubricSchema))
  async update(
    @Payload() payload: { dto: UpdateRubricDto; user: AuthenticatedUser },
  ) {
    return this.rubricsService.update(payload.user.firebaseId, payload.dto);
  }

  @MessagePattern('delete_rubric')
  @Roles(AcademyRole.INSTRUCTOR, AcademyRole.COURSE_MANAGER, AcademyRole.ADMIN)
  async remove(
    @Payload() payload: { id: string; user: AuthenticatedUser },
  ) {
    return this.rubricsService.remove(payload.id);
  }

  @MessagePattern('clone_rubric')
  @Roles(AcademyRole.INSTRUCTOR, AcademyRole.COURSE_MANAGER, AcademyRole.ADMIN)
  @UsePipes(new JoiValidationPipe(cloneRubricSchema))
  async clone(
    @Payload() payload: { dto: CloneRubricDto; user: AuthenticatedUser },
  ) {
    return this.rubricsService.clone(payload.user.firebaseId, payload.dto);
  }

  @MessagePattern('evaluate_with_rubric')
  @Roles(AcademyRole.INSTRUCTOR, AcademyRole.COURSE_MANAGER, AcademyRole.ADMIN)
  @UsePipes(new JoiValidationPipe(evaluateWithRubricSchema))
  async evaluateWithRubric(
    @Payload() payload: { dto: EvaluateWithRubricDto; user: AuthenticatedUser },
  ) {
    return this.rubricsService.evaluateWithRubric(payload.dto);
  }
}
