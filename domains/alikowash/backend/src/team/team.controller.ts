import { Controller, UsePipes, UseFilters, Logger, HttpStatus } from "@nestjs/common";
import { MessagePattern, Payload, RpcException } from "@nestjs/microservices";
import { TeamService } from "./team.service";
import {
  CreateTeamMemberDto,
  UpdateTeamMemberDto,
} from "./dto/team-member.dto";
import { JoiValidationPipe } from "../common/pipes/joi-validation.pipe";
import { RpcExceptionFilter } from "../common/filters/rpc-exception.filter";
import {
  CreateTeamMemberSchema,
  UpdateTeamMemberSchema,
  TeamMemberIdSchema,
} from "./team.validation";

@Controller()
@UseFilters(RpcExceptionFilter)
export class TeamController {
  private readonly logger = new Logger(TeamController.name);

  constructor(private readonly teamService: TeamService) {}

  @MessagePattern({ cmd: "alikowash_create_team_member" })
  @UsePipes(new JoiValidationPipe(CreateTeamMemberSchema))
  async create(@Payload() payload: CreateTeamMemberDto & { user: any }) {
    if (payload.user?.globalRole !== "ADMIN") {
      throw new RpcException({
        statusCode: HttpStatus.FORBIDDEN,
        message: "Only administrators can create team members",
        error: "Forbidden",
      });
    }
    const { user, ...dto } = payload;
    return await this.teamService.create(dto as CreateTeamMemberDto);
  }

  @MessagePattern({ cmd: "alikowash_find_all_team_members" })
  async findAll(@Payload() query: any) {
    return await this.teamService.findAll(query);
  }

  @MessagePattern({ cmd: "alikowash_find_team_member_by_id" })
  @UsePipes(new JoiValidationPipe(TeamMemberIdSchema))
  async findOne(@Payload() payload: { id: string }) {
    return await this.teamService.findOne(payload.id);
  }

  @MessagePattern({ cmd: "alikowash_update_team_member" })
  @UsePipes(new JoiValidationPipe(UpdateTeamMemberSchema))
  async update(
    @Payload() payload: { id: string; dto: UpdateTeamMemberDto; user: any },
  ) {
    this.logger.log(`Received update request for member ${payload.id}. DTO: ${JSON.stringify(payload.dto)}`);
    if (payload.user?.globalRole !== "ADMIN") {
      throw new RpcException({
        statusCode: HttpStatus.FORBIDDEN,
        message: "Only administrators can update team members",
        error: "Forbidden",
      });
    }
    return await this.teamService.update(payload.id, payload.dto);
  }

  @MessagePattern({ cmd: "alikowash_remove_team_member" })
  @UsePipes(new JoiValidationPipe(TeamMemberIdSchema))
  async remove(@Payload() payload: { id: string; user: any }) {
    if (payload.user?.globalRole !== "ADMIN") {
      throw new RpcException({
        statusCode: HttpStatus.FORBIDDEN,
        message: "Only administrators can delete team members",
        error: "Forbidden",
      });
    }
    return await this.teamService.remove(payload.id);
  }
}
