import { Test, TestingModule } from '@nestjs/testing';
import { AnnouncementController } from './announcement.controller';
import { of, throwError } from 'rxjs';
import { HttpException, HttpStatus } from '@nestjs/common';
import { RequestWithUser } from '../../common/types/request-with-user.interface';
import { AuthGuard } from '../../common/guard/firebase_auth.guard';

describe('AnnouncementController', () => {
  let controller: AnnouncementController;
  let academyClient: any;

  const mockReq: RequestWithUser = {
    user: {
      firebaseId: 'user-123',
      email: 'test@example.com',
      role: 'INSTRUCTOR',
    } as any,
  } as any;

  beforeEach(async () => {
    academyClient = {
      send: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnnouncementController],
      providers: [
        {
          provide: 'ACADEMY_SERVICE',
          useValue: academyClient,
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AnnouncementController>(AnnouncementController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('removeAnnouncement', () => {
    it('should forward remove command to ACADEMY_SERVICE with payload', async () => {
      const mockResult = { id: 1, title: 'Announcement', content: 'Content' };
      academyClient.send.mockReturnValue(of(mockResult));

      const result = await controller.removeAnnouncement(mockReq, 1);

      expect(academyClient.send).toHaveBeenCalledWith(
        { cmd: 'remove_announcement' },
        { id: 1, user: mockReq.user },
      );
      expect(result).toEqual(mockResult);
    });

    it('should handle microservice error and throw HttpException', async () => {
      const error = { statusCode: HttpStatus.NOT_FOUND, message: 'Announcement not found' };
      academyClient.send.mockReturnValue(throwError(() => error));

      await expect(controller.removeAnnouncement(mockReq, 999)).rejects.toThrow(HttpException);
    });
  });
});
