import {
  Controller,
  UseGuards,
  UsePipes,
  Logger,
  UseFilters,
} from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ContractService } from './contract.service';
import { UpdateContractStatusDto } from './dto/update-contract-status.dto';
import { AddChangeOrderDto } from './dto/add-change-order.dto';
import { AuthenticatedUser } from '../user/user.service';
import { ConTechProfileGuard, RoleGuard, Roles } from '../auth';
import { RpcExceptionFilter } from '../common/filters/rpc-exception.filter';
import { JoiValidationPipe } from '../common/pipes/joi-validation.pipe';
import {
  UpdateContractStatusSchema,
  ContractIdSchema,
} from './contract.validation';

@Controller()
@UseGuards(ConTechProfileGuard)
@UseFilters(RpcExceptionFilter)
export class ContractController {
  private readonly logger = new Logger(ContractController.name);
  constructor(private readonly contractsService: ContractService) {}

  @MessagePattern({ cmd: 'uploadContract' })
  @UseGuards(RoleGuard)
  @Roles('ADMIN')
  async uploadContract(
    @Payload()
    payload: {
      projectId: number;
      file: {
        buffer: string;
        originalname: string;
        mimetype: string;
        size: number;
      };
      user: AuthenticatedUser;
    },
  ) {
    this.logger.log(
      `Uploading contract for project ID: ${payload.projectId} by admin: ${payload.user.firebaseId}`,
    );
    try {
      return await this.contractsService.uploadAndCreateContract(
        payload.projectId,
        payload.file,
        payload.user,
      );
    } catch (error) {
      this.logger.error(
        `Failed to upload contract for project ID ${payload.projectId} by user ${payload.user.firebaseId}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  @MessagePattern({ cmd: 'updateContractStatus' })
  @UseGuards(RoleGuard)
  @Roles('ADMIN', 'CLIENT')
  @UsePipes(new JoiValidationPipe(UpdateContractStatusSchema))
  async updateStatus(
    @Payload()
    payload: { id: number; user: AuthenticatedUser } & UpdateContractStatusDto,
  ) {
    this.logger.log(
      `Updating status for contract ID: ${payload.id} to ${payload.status} by: ${payload.user.firebaseId}`,
    );
    try {
      return await this.contractsService.updateStatus(
        payload.id,
        payload.status,
        payload.user,
      );
    } catch (error) {
      this.logger.error(
        `Failed to update status for contract ID ${payload.id} by user ${payload.user.firebaseId}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  @MessagePattern({ cmd: 'addChangeOrder' })
  @UseGuards(RoleGuard)
  @Roles('ADMIN')
  // We need to match the schema payload which has { contractId, dto, user }
  // But controller expects { id, addChangeOrderDto, user }. I'll rename in schema or adjust here.
  // Actually, I'll adjust the schema to match the controller or vice-versa.
  // The schema has { contractId, dto, user }. I'll rename fields in the controller call to match.
  async addChangeOrder(
    @Payload()
    payload: {
      id: number;
      addChangeOrderDto: AddChangeOrderDto;
      user: AuthenticatedUser;
    },
  ) {
    this.logger.log(
      `Adding change order to contract ID: ${payload.id} by admin: ${payload.user.firebaseId}`,
    );
    try {
      return await this.contractsService.addChangeOrder(
        payload.id,
        payload.addChangeOrderDto,
        payload.user,
      );
    } catch (error) {
      this.logger.error(
        `Failed to add change order to contract ID ${payload.id} by user ${payload.user.firebaseId}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  @MessagePattern({ cmd: 'getContractViewUrl' })
  @UsePipes(new JoiValidationPipe(ContractIdSchema))
  async getSecureViewUrl(
    @Payload() payload: { id: number; user: AuthenticatedUser },
  ) {
    this.logger.log(
      `Generating secure view URL for contract ID: ${payload.id} (requested by: ${payload.user.firebaseId})`,
    );
    try {
      return await this.contractsService.generateSignedUrl(
        payload.id,
        payload.user,
      );
    } catch (error) {
      this.logger.error(
        `Failed to generate signed URL for contract ID ${payload.id} by user ${payload.user.firebaseId}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  @MessagePattern({ cmd: 'find_all_contracts' })
  async findAll(@Payload() payload: { user: AuthenticatedUser }) {
    this.logger.log(
      `Fetching all contracts list (requested by: ${payload.user.firebaseId})`,
    );
    try {
      return await this.contractsService.findAll(payload.user);
    } catch (error) {
      this.logger.error(
        `Failed to fetch all contracts: ${error.message}`,
      );
      throw error;
    }
  }

  @MessagePattern({ cmd: 'create_contract' })
  @UseGuards(RoleGuard)
  @Roles('ADMIN')
  async createContract(
    @Payload() payload: { projectId: number; contractUrl: string; user: AuthenticatedUser } & any
  ) {
    return this.contractsService.createContract(payload.projectId, payload.contractUrl, payload);
  }

  @MessagePattern({ cmd: 'update_contract' })
  @UseGuards(RoleGuard)
  @Roles('ADMIN')
  async updateContract(
    @Payload() payload: { id: number; user: AuthenticatedUser } & any
  ) {
    const { id, user, ...data } = payload;
    return this.contractsService.update(id, data, user);
  }

  @MessagePattern({ cmd: 'remove_contract' })
  @UseGuards(RoleGuard)
  @Roles('ADMIN')
  async removeContract(
    @Payload() payload: { id: number; user: AuthenticatedUser }
  ) {
    return this.contractsService.remove(payload.id, payload.user);
  }

  @MessagePattern({ cmd: 'getContractsByProjectId' })
  async getContractsByProjectId(
    @Payload() payload: { projectId: number; user: AuthenticatedUser },
  ) {
    this.logger.log(
      `Fetching contracts for project ID: ${payload.projectId} (requested by: ${payload.user.firebaseId})`,
    );
    try {
      return await this.contractsService.findByProjectId(
        payload.projectId,
        payload.user,
      );
    } catch (error) {
      this.logger.error(
        `Failed to fetch contracts for project ID ${payload.projectId} by user ${payload.user.firebaseId}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }
}
