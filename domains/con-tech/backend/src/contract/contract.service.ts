import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryService, MulterFile } from '../cloudinary/cloudinary.service';
import { v2 as _cloudinary } from 'cloudinary';
import { ContractStatus, Prisma, Project } from '@prisma/client';
import { AddChangeOrderDto } from './dto/add-change-order.dto';
import { AuthenticatedUser, UserService } from '../user/user.service';

@Injectable()
export class ContractService {
  constructor(
    private prisma: PrismaService,
    private cloudinaryService: CloudinaryService, // Inject your Cloudinary service
    private userService: UserService,
  ) {}

  /**
   * Create a new contract record
   */
  async createContract(projectId: number, contractUrl: string, data?: any) {
    // Validate URL but don't crash if it's just a file name or placeholder
    let validUrl = contractUrl;
    try {
      if (contractUrl) new URL(contractUrl);
    } catch {
      // Just keep it as is, maybe it's a relative path or placeholder
    }

    // Save the metadata to the database
    return this.prisma.contract.create({
      data: {
        projectId,
        title: (data as any)?.title || null,
        contractFile: validUrl || 'pending_upload',
        status: (data as any)?.status || 'DRAFT',
        changeOrders: [], // Initial empty array
      } as any,
    });
  }

  /**
   * Upload a contract file and create a contract record
   * Handles base64 encoded files from API Gateway
   */
  async uploadAndCreateContract(
    projectId: number,
    file: {
      buffer: string;
      originalname: string;
      mimetype: string;
      size: number;
    },
    _user: AuthenticatedUser,
  ) {
    // Verify project exists
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Decode base64 buffer
    const fileBuffer = Buffer.from(file.buffer, 'base64');

    // Create mock Multer file for Cloudinary upload
    const mockFile: MulterFile = {
      buffer: fileBuffer,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
    };

    // Upload to Cloudinary as raw file (for documents like PDFs)
    const uploadResult = await this.cloudinaryService.uploadRaw(mockFile, {
      folder: `contech/contracts/${projectId}`,
      public_id: `contract_${Date.now()}`,
    });

    // Create contract record with uploaded file URL
    return this.prisma.contract.create({
      data: {
        projectId,
        title: (file as any).title || file.originalname || null,
        contractFile: uploadResult.secure_url,
        status: 'DRAFT',
        changeOrders: [],
      } as any,
    });
  }

  async updateStatus(
    id: number,
    status: ContractStatus,
    user: AuthenticatedUser,
  ) {
    const _contract = await this.findContractById(id, user); // RBAC included

    // Extra check: Only Pm/Admin/Client can update status.
    // Contractor probably shouldn't update contract status.
    const profile = await this.userService.getOrCreateProfile(user);
    if (profile.role === 'CONTRACTOR') {
      throw new ForbiddenException(
        'Contractors cannot update contract status.',
      );
    }

    return this.prisma.contract.update({
      where: { id },
      data: { status },
    });
  }

  async addChangeOrder(
    id: number,
    changeOrderDto: AddChangeOrderDto,
    user: AuthenticatedUser,
  ) {
    const contract = await this.findContractById(id, user);

    return this.prisma.contract.update({
      where: { id },
      data: {
        changeOrders: [
          ...((contract.changeOrders as Prisma.JsonArray) || []),
          {
            ...changeOrderDto,
            createdAt: new Date().toISOString(),
          } as unknown as Prisma.JsonObject,
        ],
      },
    });
  }

  async update(id: number, data: any, user: AuthenticatedUser) {
    await this.findContractById(id, user); // check permissions
    // Filter to only valid Contract model fields
    const allowedFields = ['projectId', 'title', 'contractFile', 'status', 'changeOrders'];
    const filteredData: any = {};
    for (const key of allowedFields) {
      if (data[key] !== undefined) {
        if (key === 'projectId' && typeof data[key] === 'string') {
          filteredData[key] = parseInt(data[key], 10);
        } else {
          filteredData[key] = data[key];
        }
      }
    }
    return this.prisma.contract.update({
      where: { id },
      data: filteredData,
    });
  }

  async remove(id: number, user: AuthenticatedUser) {
    await this.findContractById(id, user); // check permissions
    return this.prisma.contract.delete({
      where: { id },
    });
  }

  async generateSignedUrl(
    id: number,
    user: AuthenticatedUser,
  ): Promise<{ signedUrl: string }> {
    const contract = await this.findContractById(id, user);
    return { signedUrl: contract.contractFile };
  }

  async findAll(user: AuthenticatedUser, projectId?: number) {
    const profile = await this.userService.getOrCreateProfile(user);
    const where: Prisma.ContractWhereInput = {};
    if (projectId) where.projectId = projectId;

    if (profile.role === 'CLIENT') {
      where.Project = { clientId: user.firebaseId };
    } else if (profile.role === 'CONTRACTOR') {
      where.Project = { contractorId: user.firebaseId };
    }

    const contracts = await this.prisma.contract.findMany({
      where,
      include: { Project: true },
    });
    return {
      items: contracts,
      total: contracts.length,
    };
  }

  async findByProjectId(projectId: number, user: AuthenticatedUser) {
    return this.findAll(user, projectId);
  }

  // Helper to prevent code duplication
  private async findContractById(id: number, user: AuthenticatedUser) {
    const contract = await this.prisma.contract.findUnique({
      where: { id },
      include: { Project: true },
    });
    if (!contract) {
      throw new NotFoundException(`Contract with ID ${id} not found.`);
    }

    const project = (contract as unknown as { Project: Project }).Project;
    const profile = await this.userService.getOrCreateProfile(user);
    if (profile.role === 'CLIENT' && project.clientId !== user.firebaseId) {
      throw new ForbiddenException(
        'You do not have permission to access this contract.',
      );
    }
    if (
      profile.role === 'CONTRACTOR' &&
      project.contractorId !== user.firebaseId
    ) {
      throw new ForbiddenException(
        'You do not have permission to access this contract.',
      );
    }

    return contract;
  }
}
