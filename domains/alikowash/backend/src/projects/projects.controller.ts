import {
  Controller,
  UseGuards,
  UsePipes,
  UseFilters,
  Logger,
  HttpStatus,
} from "@nestjs/common";
import { MessagePattern, Payload, RpcException } from "@nestjs/microservices";
import { ProjectsService } from "./projects.service";
import { CreateProjectDto } from "./dto/create-project.dto";
import { UpdateProjectDto } from "./dto/update-project.dto";
import { JoiValidationPipe } from "../common/pipes/joi-validation.pipe";
import { RpcExceptionFilter } from "../common/filters/rpc-exception.filter";
import {
  CreateProjectSchema,
  UpdateProjectSchema,
  ProjectIdSchema,
  FindAllProjectsSchema,
} from "./projects.validation";

@Controller()
@UseFilters(RpcExceptionFilter)
export class ProjectsController {
  private readonly logger = new Logger(ProjectsController.name);

  constructor(private readonly projectsService: ProjectsService) {}

  @MessagePattern({ cmd: "alikowash_get_stats" })
  async getStats() {
    const projects = await this.projectsService.findAll({});
    const totalCapacity = projects.reduce((sum, p) => sum + (p.capacityM3 || 0), 0);
    return {
      totalProjects: projects.length,
      totalCapacityM3: totalCapacity,
      activePartners: 12, // Placeholder or fetch from PartnersService
      impactCount: 2500, // Placeholder
    };
  }

  @MessagePattern({ cmd: "alikowash_create_project" })
  @UsePipes(new JoiValidationPipe(CreateProjectSchema))
  async create(@Payload() payload: CreateProjectDto & { user: any }) {
    this.logger.log(`Handling cmd:alikowash_create_project by user: ${payload.user?.email}`);
    if (payload.user?.globalRole !== "ADMIN") {
      this.logger.warn(`Unauthorized attempt to create project by user: ${payload.user?.email}`);
      throw new RpcException({
        statusCode: HttpStatus.FORBIDDEN,
        message: "Only administrators can create projects",
        error: "Forbidden",
      });
    }
    const { user, ...dto } = payload;
    return await this.projectsService.create(dto as CreateProjectDto);
  }

  @MessagePattern({ cmd: "alikowash_find_all_projects" })
  @UsePipes(new JoiValidationPipe(FindAllProjectsSchema))
  async findAll(@Payload() query: any) {
    this.logger.log(`Handling cmd:alikowash_find_all_projects with query: ${JSON.stringify(query)}`);
    return await this.projectsService.findAll(query);
  }

  @MessagePattern({ cmd: "alikowash_find_project_by_id" })
  @UsePipes(new JoiValidationPipe(ProjectIdSchema))
  async findOne(@Payload() payload: { id: string }) {
    this.logger.log(`Handling cmd:alikowash_find_project_by_id for ID: ${payload.id}`);
    return await this.projectsService.findOne(payload.id);
  }

  @MessagePattern({ cmd: "alikowash_update_project" })
  @UsePipes(new JoiValidationPipe(UpdateProjectSchema))
  async update(
    @Payload() payload: { id: string; dto: UpdateProjectDto; user: any },
  ) {
    this.logger.log(`Handling cmd:alikowash_update_project for ID: ${payload.id} by user: ${payload.user?.email}`);
    if (payload.user?.globalRole !== "ADMIN") {
      this.logger.warn(`Unauthorized attempt to update project by user: ${payload.user?.email}`);
      throw new RpcException({
        statusCode: HttpStatus.FORBIDDEN,
        message: "Only administrators can update projects",
        error: "Forbidden",
      });
    }
    return await this.projectsService.update(payload.id, payload.dto);
  }

  @MessagePattern({ cmd: "alikowash_remove_project" })
  @UsePipes(new JoiValidationPipe(ProjectIdSchema))
  async remove(@Payload() payload: { id: string; user: any }) {
    this.logger.log(`Handling cmd:alikowash_remove_project for ID: ${payload.id} by user: ${payload.user?.email}`);
    if (payload.user?.globalRole !== "ADMIN") {
      this.logger.warn(`Unauthorized attempt to delete project by user: ${payload.user?.email}`);
      throw new RpcException({
        statusCode: HttpStatus.FORBIDDEN,
        message: "Only administrators can delete projects",
        error: "Forbidden",
      });
    }
    return await this.projectsService.remove(payload.id);
  }
}
