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
      findOne: jest.fn(),
      update: jest.fn(),
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

  describe('findOne', () => {
    it('should call announcementsService.findOne and return result', async () => {
      const mockResult = { id: 1, title: 'Announcement', content: 'Content' };
      service.findOne.mockResolvedValue(mockResult);

      const payload = { id: 1 };
      const result = await controller.findOne(payload);

      expect(service.findOne).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockResult);
    });

    it('should throw error if announcementsService.findOne throws', async () => {
      const error = new Error('Not found');
      service.findOne.mockRejectedValue(error);

      const payload = { id: 999 };
      await expect(controller.findOne(payload)).rejects.toThrow('Not found');
    });
  });

  describe('update', () => {
    it('should call announcementsService.update and return result', async () => {
      const mockResult = { id: 1, title: 'Updated Title', content: 'Updated Content' };
      service.update.mockResolvedValue(mockResult);

      const payload = {
        id: 1,
        dto: { title: 'Updated Title' },
        user: mockUser,
      };
      const result = await controller.update(payload);

      expect(service.update).toHaveBeenCalledWith(1, { title: 'Updated Title' }, mockUser);
      expect(result).toEqual(mockResult);
    });

    it('should throw error if announcementsService.update throws', async () => {
      const error = new Error('Update error');
      service.update.mockRejectedValue(error);

      const payload = {
        id: 1,
        dto: { title: 'Updated Title' },
        user: mockUser,
      };
      await expect(controller.update(payload)).rejects.toThrow('Update error');
    });
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
