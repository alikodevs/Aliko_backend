import { Test, TestingModule } from '@nestjs/testing';
import { AnnouncementsService } from './announcements.service';
import { PrismaService } from '../prisma/prisma.service';
import { UserService, AuthenticatedUser } from '../user/user.service';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { AcademyRole } from '../generated/client';

describe('AnnouncementsService', () => {
  let service: AnnouncementsService;
  let prismaService: any;
  let userService: any;

  const mockUser: AuthenticatedUser = {
    firebaseId: 'user-123',
    email: 'test@example.com',
    firstname: 'Test',
    lastname: 'User',
    role: 'INSTRUCTOR',
    status: 'ACTIVE',
  };

  beforeEach(async () => {
    prismaService = {
      announcement: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
    };

    userService = {
      getOrCreateProfile: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnnouncementsService,
        {
          provide: PrismaService,
          useValue: prismaService,
        },
        {
          provide: UserService,
          useValue: userService,
        },
      ],
    }).compile();

    service = module.get<AnnouncementsService>(AnnouncementsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('remove', () => {
    it('should throw ForbiddenException if user is not admin or instructor', async () => {
      userService.getOrCreateProfile.mockResolvedValue({ role: AcademyRole.STUDENT });

      await expect(service.remove(1, mockUser)).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if announcement does not exist', async () => {
      userService.getOrCreateProfile.mockResolvedValue({ role: AcademyRole.ADMIN });
      prismaService.announcement.findUnique.mockResolvedValue(null);

      await expect(service.remove(999, mockUser)).rejects.toThrow(NotFoundException);
      expect(prismaService.announcement.findUnique).toHaveBeenCalledWith({
        where: { id: 999 },
      });
    });

    it('should delete and return announcement when user is admin or instructor and announcement exists', async () => {
      const mockAnnouncement = { id: 1, title: 'Announcement 1', content: 'Content 1' };
      userService.getOrCreateProfile.mockResolvedValue({ role: AcademyRole.INSTRUCTOR });
      prismaService.announcement.findUnique.mockResolvedValue(mockAnnouncement);
      prismaService.announcement.delete.mockResolvedValue(mockAnnouncement);

      const result = await service.remove(1, mockUser);

      expect(prismaService.announcement.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(prismaService.announcement.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(result).toEqual(mockAnnouncement);
    });
  });
});
