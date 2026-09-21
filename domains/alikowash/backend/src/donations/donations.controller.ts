import { Controller, UsePipes, UseFilters, Logger, HttpStatus } from "@nestjs/common";
import { MessagePattern, Payload, RpcException } from "@nestjs/microservices";
import { DonationsService } from "./donations.service";
import { CreateDonationDto } from "./dto/create-donation.dto";
import { JoiValidationPipe } from "../common/pipes/joi-validation.pipe";
import { RpcExceptionFilter } from "../common/filters/rpc-exception.filter";
import {
  CreateDonationSchema,
  DonationIdSchema,
  UpdateDonationStatusSchema,
} from "./donations.validation";

@Controller()
@UseFilters(RpcExceptionFilter)
export class DonationsController {
  private readonly logger = new Logger(DonationsController.name);

  constructor(private readonly donationsService: DonationsService) {}

  @MessagePattern({ cmd: "alikowash_submit_donation" })
  @UsePipes(new JoiValidationPipe(CreateDonationSchema))
  async create(@Payload() dto: CreateDonationDto) {
    return await this.donationsService.create(dto);
  }

  @MessagePattern({ cmd: "alikowash_find_all_donations" })
  async findAll(@Payload() payload: { user: any }) {
    if (payload.user?.globalRole !== "ADMIN") {
      throw new RpcException({
        statusCode: HttpStatus.FORBIDDEN,
        message: "Only administrators can view donations",
        error: "Forbidden",
      });
    }
    return await this.donationsService.findAll({});
  }

  @MessagePattern({ cmd: "alikowash_find_donation_by_id" })
  @UsePipes(new JoiValidationPipe(DonationIdSchema))
  async findOne(@Payload() payload: { id: string; user: any }) {
    if (payload.user?.globalRole !== "ADMIN") {
      throw new RpcException({
        statusCode: HttpStatus.FORBIDDEN,
        message: "Only administrators can view donations",
        error: "Forbidden",
      });
    }
    return await this.donationsService.findOne(payload.id);
  }

  @MessagePattern({ cmd: "alikowash_update_donation_status" })
  @UsePipes(new JoiValidationPipe(UpdateDonationStatusSchema))
  async updateStatus(
    @Payload() payload: { id: string; status: string; user: any },
  ) {
    if (payload.user?.globalRole !== "ADMIN") {
      throw new RpcException({
        statusCode: HttpStatus.FORBIDDEN,
        message: "Only administrators can update donation status",
        error: "Forbidden",
      });
    }
    return await this.donationsService.updateStatus(payload.id, payload.status);
  }

  @MessagePattern({ cmd: "alikowash_remove_donation" })
  @UsePipes(new JoiValidationPipe(DonationIdSchema))
  async remove(@Payload() payload: { id: string; user: any }) {
    if (payload.user?.globalRole !== "ADMIN") {
      throw new RpcException({
        statusCode: HttpStatus.FORBIDDEN,
        message: "Only administrators can delete donations",
        error: "Forbidden",
      });
    }
    return await this.donationsService.remove(payload.id);
  }
}
