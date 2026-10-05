import { Test, TestingModule } from '@nestjs/testing';
import { RsvpsController } from './rsvps.controller';
import { RsvpsService } from './rsvps.service';
import { PrismaService } from '../database/prisma.service';
import { UserService, AuthenticatedUser } from '../user/user.service';
import { EmailService } from '../common/email.service';
import { EventsRole } from '../generated/client';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { CreateRsvpSchema, RsvpIdSchema, UpdateRsvpStatusSchema } from './rsvps.validation';

describe('RsvpsModule (RsvpsController & RsvpsService)', () => {
  let controller: RsvpsController;
  let service: RsvpsService;
  let prisma: any;
  let userService: any;
  let emailService: any;

  const mockHostUser: AuthenticatedUser = {
    firebaseId: 'host-123',
    email: 'host@example.com',
    firstname: 'Host',
    lastname: 'User',
    role: 'USER',
    status: 'ACTIVE',
  };

  beforeEach(async () => {
    prisma = {
      post: {
        findUnique: jest.fn(),
      },
      rSVP: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    userService = {
      getProfileAndSync: jest.fn(),
    };

    emailService = {
      sendRsvpConfirmationEmail: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RsvpsController],
      providers: [
        RsvpsService,
        { provide: PrismaService, useValue: prisma },
        { provide: UserService, useValue: userService },
        { provide: EmailService, useValue: emailService },
      ],
    }).compile();

    controller = module.get<RsvpsController>(RsvpsController);
    service = module.get<RsvpsService>(RsvpsService);
  });

  describe('Endpoint: create_rsvp', () => {
    it('creates RSVP for SOCIAL_EVENT and sends confirmation email with action links', async () => {
      prisma.post.findUnique.mockResolvedValue({
        id: 'event-soc-1',
        title: 'Birthday Party',
        slug: 'birthday-party',
        type: 'SOCIAL_EVENT',
        eventDate: new Date('2026-10-10T18:00:00Z'),
      });
      prisma.rSVP.create.mockResolvedValue({
        id: 'rsvp-1',
        eventId: 'event-soc-1',
        guestName: 'Jane Smith',
        guestEmail: 'jane@example.com',
        response: 'yes',
      });

      const dto = {
        eventId: 'event-soc-1',
        guestName: 'Jane Smith',
        guestEmail: 'jane@example.com',
        response: 'yes' as const,
      };

      const result = await controller.create({ dto });
      expect(result.id).toBe('rsvp-1');
      expect(emailService.sendRsvpConfirmationEmail).toHaveBeenCalledWith(
        'jane@example.com',
        'Jane Smith',
        'Birthday Party',
        expect.any(String),
        'yes',
        'rsvp-1',
        'birthday-party',
      );
    });

    it('rejects RSVP if event is not SOCIAL_EVENT', async () => {
      prisma.post.findUnique.mockResolvedValue({
        id: 'event-pro',
        title: 'Conference',
        type: 'EVENT',
      });

      const dto = {
        eventId: 'event-pro',
        guestName: 'Jane Smith',
        guestEmail: 'jane@example.com',
        response: 'yes' as const,
      };

      await expect(controller.create({ dto })).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException if event does not exist', async () => {
      prisma.post.findUnique.mockResolvedValue(null);

      const dto = {
        eventId: 'non-existing',
        guestName: 'Jane Smith',
        guestEmail: 'jane@example.com',
        response: 'yes' as const,
      };

      await expect(controller.create({ dto })).rejects.toThrow(NotFoundException);
    });

    it('validates response with CreateRsvpSchema', () => {
      const invalid = {
        dto: {
          eventId: 'ev-1',
          guestName: 'Jane',
          guestEmail: 'invalid-email',
          response: 'not-a-valid-response',
        },
      };
      const { error } = CreateRsvpSchema.validate(invalid);
      expect(error).toBeDefined();
    });
  });

  describe('Endpoint: update_rsvp_status', () => {
    it('updates RSVP response status and sends updated confirmation email', async () => {
      prisma.rSVP.findUnique.mockResolvedValue({
        id: 'rsvp-1',
        eventId: 'event-soc-1',
        guestName: 'Jane Smith',
        guestEmail: 'jane@example.com',
        response: 'maybe',
        event: {
          id: 'event-soc-1',
          title: 'Birthday Party',
          slug: 'birthday-party',
          eventDate: new Date('2026-10-10T18:00:00Z'),
        },
      });
      prisma.rSVP.update.mockResolvedValue({
        id: 'rsvp-1',
        guestName: 'Jane Smith',
        guestEmail: 'jane@example.com',
        response: 'yes',
      });

      const result = await controller.updateStatus({ id: 'rsvp-1', dto: { response: 'yes' } });
      expect(result.response).toBe('yes');
      expect(prisma.rSVP.update).toHaveBeenCalledWith({
        where: { id: 'rsvp-1' },
        data: { response: 'yes' },
      });
      expect(emailService.sendRsvpConfirmationEmail).toHaveBeenCalledWith(
        'jane@example.com',
        'Jane Smith',
        'Birthday Party',
        expect.any(String),
        'yes',
        'rsvp-1',
        'birthday-party',
      );
    });

    it('throws NotFoundException if RSVP does not exist', async () => {
      prisma.rSVP.findUnique.mockResolvedValue(null);

      await expect(
        controller.updateStatus({ id: 'non-existing', dto: { response: 'yes' } }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException for invalid response value', async () => {
      await expect(
        service.updateStatus('rsvp-1', 'invalid_status'),
      ).rejects.toThrow(BadRequestException);
    });

    it('validates update payload with UpdateRsvpStatusSchema', () => {
      const valid = {
        id: 'rsvp-1',
        dto: { response: 'no' },
      };
      const { error: validError } = UpdateRsvpStatusSchema.validate(valid);
      expect(validError).toBeUndefined();

      const invalid = {
        id: 'rsvp-1',
        dto: { response: 'definitely' },
      };
      const { error: invalidError } = UpdateRsvpStatusSchema.validate(invalid);
      expect(invalidError).toBeDefined();
    });
  });

  describe('Endpoint: find_all_rsvps', () => {
    it('returns RSVPs for host events', async () => {
      userService.getProfileAndSync.mockResolvedValue({ id: mockHostUser.firebaseId, role: EventsRole.USER });
      prisma.rSVP.findMany.mockResolvedValue([{ id: 'rsvp-1' }]);

      const result = await controller.findAll({ user: mockHostUser });
      expect(result).toHaveLength(1);
      expect(prisma.rSVP.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { event: { authorId: mockHostUser.firebaseId } },
        }),
      );
    });
  });

  describe('Endpoint: remove_rsvp', () => {
    it('allows host to remove RSVP', async () => {
      prisma.rSVP.findUnique.mockResolvedValue({
        id: 'rsvp-1',
        event: { authorId: mockHostUser.firebaseId },
      });
      userService.getProfileAndSync.mockResolvedValue({ id: mockHostUser.firebaseId, role: EventsRole.USER });
      prisma.rSVP.delete.mockResolvedValue({ id: 'rsvp-1' });

      const result = await controller.remove({ id: 'rsvp-1', user: mockHostUser });
      expect(result.id).toBe('rsvp-1');
    });

    it('denies removing RSVP if user is not host and not admin', async () => {
      prisma.rSVP.findUnique.mockResolvedValue({
        id: 'rsvp-1',
        event: { authorId: 'another-host' },
      });
      userService.getProfileAndSync.mockResolvedValue({ id: mockHostUser.firebaseId, role: EventsRole.USER });

      await expect(controller.remove({ id: 'rsvp-1', user: mockHostUser })).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
