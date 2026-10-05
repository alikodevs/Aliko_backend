
import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrismaService = {
  application: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
};

describe('UserService', () => {
  let service: UserService;
  let prisma: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('updateTeacherApplicationStatus', () => {
    it('should throw error if approving without reviewer (TEST-02)', async () => {
       await expect(
           service.updateTeacherApplicationStatus('1', 'APPROVED')
       ).rejects.toThrow('ReviewedBy is required');
    });

    it('should throw error if rejecting without notes (TEST-02)', async () => {
        await expect(
            service.updateTeacherApplicationStatus('1', 'REJECTED', 'reviewer')
        ).rejects.toThrow('Review notes are required');
     });

    it('should throw error if approving without resume (TEST-02)', async () => {
        prisma.application.findUnique.mockResolvedValue({ id: 1, formData: {} }); // no resumeUrl

        await expect(
            service.updateTeacherApplicationStatus('1', 'APPROVED', 'reviewer')
        ).rejects.toThrow('Cannot approve application without a resume');
     });
    
     it('should succeed if all valid', async () => {
        prisma.application.findUnique.mockResolvedValue({ id: 1, formData: { resumeUrl: 'http://resume' } });
        prisma.application.update.mockResolvedValue({ id: 1, status: 'APPROVED' });

        const result = await service.updateTeacherApplicationStatus('1', 'APPROVED', 'reviewer');
        expect(result).toBeDefined();
     });
  });
});
