import {
  Controller,
  UseGuards,
  UsePipes,
  UseFilters,
  Logger,
  HttpStatus,
} from "@nestjs/common";
import { MessagePattern, Payload, RpcException } from "@nestjs/microservices";
import { PartnersService } from "./partners.service";
import { CreatePartnerDto } from "./dto/create-partner.dto";
import { UpdatePartnerDto } from "./dto/update-partner.dto";
import { JoiValidationPipe } from "../common/pipes/joi-validation.pipe";
import { RpcExceptionFilter } from "../common/filters/rpc-exception.filter";
import {
  CreatePartnerSchema,
  UpdatePartnerSchema,
  PartnerIdSchema,
} from "./partners.validation";

@Controller()
@UseFilters(RpcExceptionFilter)
export class PartnersController {
  private readonly logger = new Logger(PartnersController.name);

  constructor(private readonly partnersService: PartnersService) {}

  @MessagePattern({ cmd: "alikowash_create_partner" })
  @UsePipes(new JoiValidationPipe(CreatePartnerSchema))
  async create(@Payload() payload: CreatePartnerDto & { user: any }) {
    if (payload.user?.globalRole !== "ADMIN") {
      throw new RpcException({
        statusCode: HttpStatus.FORBIDDEN,
        message: "Only administrators can create partners",
        error: "Forbidden",
      });
    }
    const { user, ...dto } = payload;
    return await this.partnersService.create(dto as CreatePartnerDto);
  }

  @MessagePattern({ cmd: "alikowash_find_all_partners" })
  async findAll(@Payload() query: any) {
    return await this.partnersService.findAll(query);
  }

  @MessagePattern({ cmd: "alikowash_find_partner_by_id" })
  @UsePipes(new JoiValidationPipe(PartnerIdSchema))
  async findOne(@Payload() payload: { id: string }) {
    return await this.partnersService.findOne(payload.id);
  }

  @MessagePattern({ cmd: "alikowash_update_partner" })
  @UsePipes(new JoiValidationPipe(UpdatePartnerSchema))
  async update(
    @Payload() payload: { id: string; dto: UpdatePartnerDto; user: any },
  ) {
    if (payload.user?.globalRole !== "ADMIN") {
      throw new RpcException({
        statusCode: HttpStatus.FORBIDDEN,
        message: "Only administrators can update partners",
        error: "Forbidden",
      });
    }
    return await this.partnersService.update(payload.id, payload.dto);
  }

  @MessagePattern({ cmd: "alikowash_remove_partner" })
  @UsePipes(new JoiValidationPipe(PartnerIdSchema))
  async remove(@Payload() payload: { id: string; user: any }) {
    if (payload.user?.globalRole !== "ADMIN") {
      throw new RpcException({
        statusCode: HttpStatus.FORBIDDEN,
        message: "Only administrators can delete partners",
        error: "Forbidden",
      });
    }
    return await this.partnersService.remove(payload.id);
  }
}
