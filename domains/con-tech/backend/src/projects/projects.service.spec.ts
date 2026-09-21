import { Test, TestingModule } from '@nestjs/testing';
import { ProjectsService } from './projects.service';
import { PrismaService } from '../prisma/prisma.service';
import { UserService, AuthenticatedUser } from '../user/user.service';
import { ForbiddenException, BadRequestException } from '@nestjs/common';
import { Project, ProjectUpdate } from '@prisma/client';

type DeepMockPromise<T> = {
  [K in keyof T]: T[K] extends (...args: infer A) => any
    ? jest.Mock<Promise<any>, A>
    : T[K] extends object
      ? DeepMockPromise<T[K]>
      : T[K];
};

const mockPrismaService = {
  project: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  projectUpdate: {
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  projectDocument: {
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
} as unknown as DeepMockPromise<PrismaService>;

const mockUserService = {
  getOrCreateProfile: jest.fn(),
  getUsersByIds: jest.fn().mockResolvedValue([]),
} as unknown as DeepMockPromise<UserService>;

const testUser: AuthenticatedUser = {
  firebaseId: 'uid',
  email: 'test@example.com',
  firstname: 'Test',
  lastname: 'User',
  role: 'CONTRACTOR',
  status: 'ACTIVE',
};

describe('ProjectsService', () => {
  let service: ProjectsService;
  let prisma: DeepMockPromise<PrismaService>;
  let userService: DeepMockPromise<UserService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: UserService, useValue: mockUserService },
      ],
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);
    prisma = module.get<PrismaService>(
      PrismaService,
    ) as unknown as DeepMockPromise<PrismaService>;
    userService = module.get<UserService>(
      UserService,
    ) as unknown as DeepMockPromise<UserService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('updateProgress', () => {
    it('should throw BadRequestException if progress is invalid', async () => {
      await expect(service.updateProgress(1, 150, testUser)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should allow contractor to update their assigned project', async () => {
      prisma.project.findUnique.mockResolvedValue({
        id: 1,
        contractorId: 'uid',
        manager: 'manager',
      } as Project);
      userService.getOrCreateProfile.mockResolvedValue({ role: 'CONTRACTOR' });
      prisma.project.update.mockResolvedValue({
        id: 1,
        progress: 50,
      } as Project);

      const result = await service.updateProgress(1, 50, testUser);
      expect(prisma.project.update).toHaveBeenCalled();
      expect(result.progress).toBe(50);
    });

    it('should throw ForbiddenException if unassigned contractor tries to update', async () => {
      prisma.project.findUnique.mockResolvedValue({
        id: 1,
        contractorId: 'other-uid',
        manager: 'manager',
      } as Project);
      userService.getOrCreateProfile.mockResolvedValue({ role: 'CONTRACTOR' });

      await expect(service.updateProgress(1, 50, testUser)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('createProjectUpdate (Weekly Updates)', () => {
    it('should create an update if user is authorized', async () => {
      prisma.project.findUnique.mockResolvedValue({
        id: 1,
        contractorId: 'uid',
      } as Project);
      userService.getOrCreateProfile.mockResolvedValue({ role: 'CONTRACTOR' });
      prisma.projectUpdate.create.mockResolvedValue({
        id: 1,
        text: 'update',
      } as ProjectUpdate);

      await service.createProjectUpdate(1, 'update', testUser);
      expect(prisma.projectUpdate.create).toHaveBeenCalledWith(
        expect.objectContaining({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          data: expect.objectContaining({
            text: 'update',
            isVisibleToClient: false, // default check
          }),
        }),
      );
    });

    it('should set isVisibleToClient if provided', async () => {
      prisma.project.findUnique.mockResolvedValue({
        id: 1,
        contractorId: 'uid',
      } as Project);
      userService.getOrCreateProfile.mockResolvedValue({ role: 'CONTRACTOR' });

      await service.createProjectUpdate(1, 'update', testUser, true);
      expect(prisma.projectUpdate.create).toHaveBeenCalledWith(
        expect.objectContaining({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          data: expect.objectContaining({
            isVisibleToClient: true,
          }),
        }),
      );
    });
  });

  describe('addDocument', () => {
    it('should add a document with visibility flags', async () => {
      prisma.project.findUnique.mockResolvedValue({
        id: 1,
        contractorId: 'uid',
      } as Project);
      userService.getOrCreateProfile.mockResolvedValue({ role: 'CONTRACTOR' });

      const dto = { title: 'doc', url: 'http://doc', isVisibleToClient: true };
      await service.addDocument(1, dto, testUser);

      expect(prisma.projectDocument.create).toHaveBeenCalledWith(
        expect.objectContaining({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          data: expect.objectContaining({
            title: 'doc',
            isVisibleToClient: true,
          }),
        }),
      );
    });
  });
});
