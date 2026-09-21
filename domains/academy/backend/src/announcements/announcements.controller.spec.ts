import { Test, TestingModule } from '@nestjs/testing';
import { AnnouncementsController } from './announcements.controller';
import { AnnouncementsService } from './announcements.service';
import { UserService, AuthenticatedUser } from '../user/user.service';
import { Reflector } from '@nestjs/core';

describe('AnnouncementsController', () => {
  let controller: AnnouncementsController;
  let service: any;

  const mockUser: AuthenticatedUser = {
    firebaseId: 'user-123',
    email: 'test@example.com',
    firstname: 'Test',
    lastname: 'User',
    role: 'INSTRUCTOR',
    status: 'ACTIVE',
  };

  beforeEach(async () => {
    service = {
      create: jest.fn(),
      findAll: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnnouncementsController],
      providers: [
        {
          provide: AnnouncementsService,
          useValue: service,
        },
        {
          provide: UserService,
          useValue: {
            getOrCreateProfile: jest.fn(),
          },
        },
        Reflector,
      ],
    }).compile();

    controller = module.get<AnnouncementsController>(AnnouncementsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('remove', () => {
    it('should call announcementsService.remove and return result', async () => {
      const mockResult = { id: 1, title: 'Announcement', content: 'Content' };
      service.remove.mockResolvedValue(mockResult);

      const payload = { id: 1, user: mockUser };
      const result = await controller.remove(payload);

      expect(service.remove).toHaveBeenCalledWith(1, mockUser);
      expect(result).toEqual(mockResult);
    });

    it('should throw error if announcementsService.remove throws', async () => {
      const error = new Error('Deletion error');
      service.remove.mockRejectedValue(error);

      const payload = { id: 1, user: mockUser };
      await expect(controller.remove(payload)).rejects.toThrow('Deletion error');
    });
  });
});
