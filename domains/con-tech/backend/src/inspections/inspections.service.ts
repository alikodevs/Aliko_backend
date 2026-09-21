import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service'; // Your Prisma service
import { CloudinaryService } from '../cloudinary/cloudinary.service'; // Your Cloudinary service
import { CreateInspectionDto } from './dto/create-inspection.dto';
import { UpdateInspectionDto } from './dto/update-inspection.dto';
import { AuthenticatedUser, UserService } from '../user/user.service';
import { Prisma, Project } from '@prisma/client';
@Injectable()
export class InspectionsService {
  constructor(
    private prisma: PrismaService,
    private cloudinaryService: CloudinaryService,
    private userService: UserService,
  ) {}

  async create(
    createInspectionDto: CreateInspectionDto,
    files: { buffer: string; originalname: string }[] = [],
  ) {
    const safeFiles = files || [];
    const photoUploadPromises = safeFiles.map((file) => {
      const fileBuffer = Buffer.from(file.buffer, 'base64');

      const mockFile = {
        buffer: fileBuffer,
        originalname: file.originalname,
      };

      return this.cloudinaryService.uploadImage(mockFile);
    });
    const uploadResults = await Promise.all(photoUploadPromises);
    const photoUrls = uploadResults.map((result) => result.secure_url);

    // 2. Create inspection with checklist and photos as Json
    const inspection = await this.prisma.inspection.create({
      data: {
        projectId: createInspectionDto.projectId,
        title: (createInspectionDto as any).title,
        inspector: createInspectionDto.inspectorId ?? null,
        status: createInspectionDto.status,
        photos: photoUrls, // Stored as Json array
        checklist:
          createInspectionDto.checklist as unknown as Prisma.InputJsonValue, // Stored as Json
        isVisibleToClient: createInspectionDto.isVisibleToClient ?? false,
      } as any,
    });

    return inspection;
  }

  async findAll(
    pagination: { skip?: number; take?: number; projectId?: number },
    user: AuthenticatedUser,
  ) {
    const profile = await this.userService.getOrCreateProfile(user);
    const { skip = 0, take = 20, projectId } = pagination;
    const where: Prisma.InspectionWhereInput = {};
    if (projectId) where.projectId = projectId;

    if (profile.role === 'CLIENT') {
      where.isVisibleToClient = true;
      where.Project = { clientId: user.firebaseId };
    } else if (profile.role === 'CONTRACTOR') {
      where.Project = { contractorId: user.firebaseId };
    }

    const inspections = await this.prisma.inspection.findMany({
      where,
      skip,
      take,
      include: { Project: true },
    });
    return {
      items: inspections,
      total: inspections.length, // Should ideally be count() but this works for now
    };
  }

  async findAllForProject(
    projectId: number,
    pagination: { skip?: number; take?: number },
    user: AuthenticatedUser,
  ) {
    return this.findAll({ ...pagination, projectId }, user);
  }

  async findOne(id: number, user: AuthenticatedUser) {
    const inspection = await this.prisma.inspection.findUnique({
      where: { id },
      include: { Project: true },
    });

    if (!inspection) {
      throw new NotFoundException(`Inspection with ID ${id} not found.`);
    }

    const project = (inspection as unknown as { Project: Project }).Project;
    const profile = await this.userService.getOrCreateProfile(user);
    if (profile.role === 'CLIENT' && project.clientId !== user.firebaseId) {
      throw new ForbiddenException(
        'You do not have permission to view this inspection.',
      );
    }
    if (
      profile.role === 'CONTRACTOR' &&
      project.contractorId !== user.firebaseId
    ) {
      throw new ForbiddenException(
        'You do not have permission to view this inspection.',
      );
    }

    return inspection;
  }

  async update(
    id: number,
    updateInspectionDto: UpdateInspectionDto,
    user: AuthenticatedUser,
  ) {
    const _inspection = await this.findOne(id, user); // RBAC

    return this.prisma.inspection.update({
      where: { id },
      data: {
        ...updateInspectionDto,
        status: updateInspectionDto.status,
      } as Prisma.InspectionUpdateInput,
    });
  }

  async remove(id: number, user: AuthenticatedUser) {
    await this.findOne(id, user);
    return this.prisma.inspection.delete({
      where: { id },
    });
  }

  async finalize(id: number, status: string, user: AuthenticatedUser) {
    const inspection = await this.findOne(id, user); // RBAC
    
    // Check if user is the inspector or an admin
    const contechProfile = await this.userService.getOrCreateProfile(user);
    if (contechProfile.role !== 'ADMIN' && inspection.inspector !== user.firebaseId) {
       throw new ForbiddenException('Only the assigned inspector or an admin can finalize this inspection');
    }

    return this.prisma.inspection.update({
      where: { id },
      data: { status },
    });
  }
}
