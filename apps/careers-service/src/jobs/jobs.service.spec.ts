
import { Test, TestingModule } from '@nestjs/testing';
import { JobsService } from './jobs.service';
import { PrismaService } from '../prisma/prisma.service';
import { UserService } from '../user/user.service';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

const mockPrismaService = {
  job: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
  },
  jobApplication: {
    create: jest.fn(),
  },
  careersProfile: {
    upsert: jest.fn(),
  }
};

const mockUserService = {
  getProfile: jest.fn(),
  createOrUpdateProfile: jest.fn(),
};

describe('JobsService', () => {
  let service: JobsService;
  let prisma: any;
  let userService: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: UserService, useValue: mockUserService },
      ],
    }).compile();

    service = module.get<JobsService>(JobsService);
    prisma = module.get<PrismaService>(PrismaService);
    userService = module.get<UserService>(UserService);
  });

  describe('findAllJobs', () => {
    it('should return "Not specified" if salaryRange is null (TEST-06)', async () => {
      prisma.job.findMany.mockResolvedValue([
        { id: 1, title: 'Job 1', salaryRange: null },
        { id: 2, title: 'Job 2', salaryRange: '$100k' },
      ]);

      const result = await service.findAllJobs();
      expect(result[0].salaryRange).toBe('Not specified');
      expect(result[1].salaryRange).toBe('$100k');
    });
  });

  describe('findOneJob', () => {
    it('should return "Not specified" if salaryRange is null (TEST-06)', async () => {
      prisma.job.findUnique.mockResolvedValue({ id: 1, title: 'Job 1', salaryRange: null });

      const result = await service.findOneJob(1);
      expect(result.salaryRange).toBe('Not specified');
    });
  });

  describe('applyToJob', () => {
    const mockUser = { firebaseId: 'uid', firstname: 'John', lastname: 'Doe', email: 'john@example.com' };

    it('should throw ForbiddenException if resumeUrl is not http/https', async () => {
       await expect(
           service.applyToJob(1, mockUser, { resumeUrl: 'ftp://bad-url' })
       ).rejects.toThrow(ForbiddenException);
    });

    it('should provide info from token/profile if not in applicationData', async () => {
      prisma.job.findUnique.mockResolvedValue({ id: 1, status: 'OPEN' });
      userService.getProfile.mockResolvedValue({ fullName: 'Old Name', email: 'old@example.com', phone: '123' });
      prisma.jobApplication.create.mockResolvedValue({ id: 101 });

      const applicationData = { resumeUrl: 'https://resume.pdf' };
      const result = await service.applyToJob(1, mockUser, applicationData);

      expect(prisma.jobApplication.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          fullName: 'John Doe', // From token
          email: 'john@example.com', // From token
          phone: '123' // Fallback to profile
        })
      }));
      expect(result).toEqual({ id: 101 });
    });

    it('should throw ForbiddenException if resumeUrl is invalid', async () => {
        await expect(
            service.applyToJob(1, mockUser, { resumeUrl: 'not-a-url' })
        ).rejects.toThrow(ForbiddenException);
     });
  });
});
