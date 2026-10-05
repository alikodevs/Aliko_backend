import { Test, TestingModule } from '@nestjs/testing';
import { MessagingController } from './messaging.controller';
import { MessagingService } from './messaging.service';
import { PrismaService } from '../database/prisma.service';
import { UserService, AuthenticatedUser } from '../user/user.service';
import { EmailService } from '../common/email.service';
import { EventsRole } from '../generated/client';
import { TargetAudience } from './dto/send-message.dto';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { SendMessageSchema } from './messaging.validation';

describe('MessagingModule (MessagingController & MessagingService)', () => {
  let controller: MessagingController;
  let service: MessagingService;
  let prisma: any;
  let userService: any;
  let emailService: any;

  const mockAdminUser: AuthenticatedUser = {
    firebaseId: 'admin-123',
    email: 'admin@example.com',
    firstname: 'Admin',
    lastname: 'User',
    role: 'ADMIN',
    globalRole: 'ADMIN',
    status: 'ACTIVE',
  };

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
      messageDispatch: {
        create: jest.fn(),
        findMany: jest.fn(),
      },
    };

    userService = {
      getProfileAndSync: jest.fn(),
    };

    emailService = {
      sendEventMessageEmail: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MessagingController],
      providers: [
        MessagingService,
        { provide: PrismaService, useValue: prisma },
        { provide: UserService, useValue: userService },
        { provide: EmailService, useValue: emailService },
      ],
    }).compile();

    controller = module.get<MessagingController>(MessagingController);
    service = module.get<MessagingService>(MessagingService);
  });

  describe('Endpoint: send_event_message', () => {
    it('sends broadcast to ALL attendees for an EVENT', async () => {
      prisma.post.findUnique.mockResolvedValue({
        id: 'ev-1',
        title: 'Developer Summit',
        type: 'EVENT',
        authorId: mockOrganizerUser.firebaseId,
        registrations: [
          { attendeeEmail: 'a@example.com', isCheckedIn: false },
          { attendeeEmail: 'b@example.com', isCheckedIn: true },
        ],
        rsvps: [],
      });
      userService.getProfileAndSync.mockResolvedValue({ id: mockOrganizerUser.firebaseId, role: EventsRole.CONTENT_MANAGER });
      prisma.messageDispatch.create.mockResolvedValue({ id: 'disp-1' });

      const dto = {
        subject: 'Important Update',
        body: 'Please arrive 15 minutes early.',
        targetAudience: TargetAudience.ALL,
      };

      const result = await controller.sendMessage({
        id: 'ev-1',
        dto,
        user: mockOrganizerUser,
      });

      expect(result.success).toBe(true);
      expect(result.sentCount).toBe(2);
      expect(emailService.sendEventMessageEmail).toHaveBeenCalledTimes(2);
      expect(prisma.messageDispatch.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          eventId: 'ev-1',
          recipientCount: 2,
          sentCount: 2,
          createdBy: mockOrganizerUser.firebaseId,
        }),
      });
    });

    it('filters CHECKED_IN attendees when requested', async () => {
      prisma.post.findUnique.mockResolvedValue({
        id: 'ev-1',
        title: 'Developer Summit',
        type: 'EVENT',
        authorId: mockOrganizerUser.firebaseId,
        registrations: [
          { attendeeEmail: 'a@example.com', isCheckedIn: false },
          { attendeeEmail: 'b@example.com', isCheckedIn: true },
        ],
        rsvps: [],
      });
      userService.getProfileAndSync.mockResolvedValue({ id: mockOrganizerUser.firebaseId, role: EventsRole.CONTENT_MANAGER });
      prisma.messageDispatch.create.mockResolvedValue({ id: 'disp-1' });

      const dto = {
        subject: 'Welcome inside',
        body: 'Grab your badge and coffee',
        targetAudience: TargetAudience.CHECKED_IN,
      };

      const result = await controller.sendMessage({
        id: 'ev-1',
        dto,
        user: mockOrganizerUser,
      });

      expect(result.sentCount).toBe(1);
      expect(emailService.sendEventMessageEmail).toHaveBeenCalledWith(
        'b@example.com',
        'Welcome inside',
        'Grab your badge and coffee',
        'Developer Summit',
      );
    });

    it('denies user sending message if not author and not admin', async () => {
      prisma.post.findUnique.mockResolvedValue({
        id: 'ev-1',
        title: 'Developer Summit',
        authorId: 'other-author',
        registrations: [],
        rsvps: [],
      });
      userService.getProfileAndSync.mockResolvedValue({ id: mockOrganizerUser.firebaseId, role: EventsRole.CONTENT_MANAGER });

      const dto = {
        subject: 'Spam',
        body: 'Message',
        targetAudience: TargetAudience.ALL,
      };

      await expect(
        controller.sendMessage({
          id: 'ev-1',
          dto,
          user: mockOrganizerUser,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException if event does not exist', async () => {
      prisma.post.findUnique.mockResolvedValue(null);

      const dto = {
        subject: 'Hello',
        body: 'Message',
        targetAudience: TargetAudience.ALL,
      };

      await expect(
        controller.sendMessage({
          id: 'ev-none',
          dto,
          user: mockOrganizerUser,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('Endpoint: get_messaging_stats', () => {
    it('returns 30-day stats and delivery rate', async () => {
      userService.getProfileAndSync.mockResolvedValue({ id: mockAdminUser.firebaseId, role: EventsRole.ADMIN });
      prisma.messageDispatch.findMany.mockResolvedValue([
        {
          createdAt: new Date('2026-08-01T10:00:00Z'),
          recipientCount: 10,
          sentCount: 10,
        },
        {
          createdAt: new Date('2026-08-02T10:00:00Z'),
          recipientCount: 10,
          sentCount: 9,
        },
      ]);

      const stats = await controller.getStats({ user: mockAdminUser });
      expect(stats.totalSent).toBe(19);
      expect(stats.deliveryRate).toBe(95);
      expect(stats.lastThirtyDays).toHaveLength(2);
    });
  });
});
