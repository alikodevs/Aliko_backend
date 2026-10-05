import { Test, TestingModule } from '@nestjs/testing';
import { SessionsController } from './sessions.controller';
import { SessionsService } from './sessions.service';
import { PrismaService } from '../database/prisma.service';
import { UserService, AuthenticatedUser } from '../user/user.service';
import { EventsRole } from '../generated/client';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { CreateSessionSchema, SessionIdSchema } from './sessions.validation';

describe('SessionsModule (SessionsController & SessionsService)', () => {
  let controller: SessionsController;
  let service: SessionsService;
  let prisma: any;
  let userService: any;

  const mockOrganizerUser: AuthenticatedUser = {
    firebaseId: 'org-123',
    email: 'org@example.com',
    firstname: 'Organizer',
    lastname: 'User',
    role: 'CONTENT_MANAGER',
    status: 'ACTIVE',
  };

  beforeEach(async () => {
    prisma = {
      post: {
        findUnique: jest.fn(),
      },
      session: {
        create: jest.fn(),
        findUnique: jest.fn(),
        delete: jest.fn(),
      },
    };

    userService = {
      getProfileAndSync: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SessionsController],
      providers: [
        SessionsService,
        { provide: PrismaService, useValue: prisma },
        { provide: UserService, useValue: userService },
      ],
    }).compile();

    controller = module.get<SessionsController>(SessionsController);
    service = module.get<SessionsService>(SessionsService);
  });

  describe('Endpoint: create_session', () => {
    it('creates session for event when user is author', async () => {
      prisma.post.findUnique.mockResolvedValue({ id: 'ev-1', authorId: mockOrganizerUser.firebaseId });
      userService.getProfileAndSync.mockResolvedValue({ id: mockOrganizerUser.firebaseId, role: EventsRole.CONTENT_MANAGER });
      prisma.session.create.mockResolvedValue({
        id: 'sess-1',
        eventId: 'ev-1',
        title: 'Keynote',
        speakerName: 'Dr. Smith',
      });

      const dto = {
        eventId: 'ev-1',
        title: 'Keynote',
        speakerName: 'Dr. Smith',
        startTime: '2026-09-01T09:00:00Z',
        endTime: '2026-09-01T10:00:00Z',
      };

      const result = await controller.create({ dto, user: mockOrganizerUser });
      expect(result.id).toBe('sess-1');
      expect(prisma.session.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            eventId: 'ev-1',
            title: 'Keynote',
            speakerName: 'Dr. Smith',
          }),
        }),
      );
    });

    it('rejects creating session if event not found', async () => {
      prisma.post.findUnique.mockResolvedValue(null);

      const dto = {
        eventId: 'non-existing',
        title: 'Keynote',
        startTime: '2026-09-01T09:00:00Z',
        endTime: '2026-09-01T10:00:00Z',
      };

      await expect(controller.create({ dto, user: mockOrganizerUser })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('validates schema with CreateSessionSchema', () => {
      const invalid = {
        dto: {
          eventId: 'ev-1',
          title: '',
          startTime: 'invalid-date',
          endTime: 'invalid-date',
        },
        user: mockOrganizerUser,
      };
      const { error } = CreateSessionSchema.validate(invalid);
      expect(error).toBeDefined();
    });
  });

  describe('Endpoint: remove_session', () => {
    it('removes session when user is author', async () => {
      prisma.session.findUnique.mockResolvedValue({ id: 'sess-1', eventId: 'ev-1' });
      prisma.post.findUnique.mockResolvedValue({ id: 'ev-1', authorId: mockOrganizerUser.firebaseId });
      userService.getProfileAndSync.mockResolvedValue({ id: mockOrganizerUser.firebaseId, role: EventsRole.CONTENT_MANAGER });
      prisma.session.delete.mockResolvedValue({ id: 'sess-1' });

      const result = await controller.remove({ id: 'sess-1', user: mockOrganizerUser });
      expect(result.id).toBe('sess-1');
    });

    it('throws NotFoundException if session does not exist', async () => {
      prisma.session.findUnique.mockResolvedValue(null);

      await expect(controller.remove({ id: 'sess-none', user: mockOrganizerUser })).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
