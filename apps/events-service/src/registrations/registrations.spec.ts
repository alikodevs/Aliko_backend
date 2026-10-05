import { Test, TestingModule } from '@nestjs/testing';
import { RegistrationsController } from './registrations.controller';
import { RegistrationsService } from './registrations.service';
import { PrismaService } from '../database/prisma.service';
import { UserService, AuthenticatedUser } from '../user/user.service';
import { EmailService } from '../common/email.service';
import { EventsRole } from '../generated/client';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { CreateRegistrationSchema, RegistrationIdSchema, CheckInAttendeeSchema } from './registrations.validation';

describe('RegistrationsModule (RegistrationsController & RegistrationsService)', () => {
  let controller: RegistrationsController;
  let service: RegistrationsService;
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
    firebaseId: 'organizer-123',
    email: 'org@example.com',
    firstname: 'Event',
    lastname: 'Organizer',
    role: 'CONTENT_MANAGER',
    status: 'ACTIVE',
  };

  const mockAttendeeUser: AuthenticatedUser = {
    firebaseId: 'attendee-123',
    email: 'john@example.com',
    firstname: 'John',
    lastname: 'Doe',
    role: 'USER',
    status: 'ACTIVE',
  };

  beforeEach(async () => {
    prisma = {
      post: {
        findUnique: jest.fn(),
      },
      ticket: {
        findUnique: jest.fn(),
      },
      registration: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
    };

    userService = {
      getProfileAndSync: jest.fn(),
    };

    emailService = {
      sendRegistrationEmail: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RegistrationsController],
      providers: [
        RegistrationsService,
        { provide: PrismaService, useValue: prisma },
        { provide: UserService, useValue: userService },
        { provide: EmailService, useValue: emailService },
      ],
    }).compile();

    controller = module.get<RegistrationsController>(RegistrationsController);
    service = module.get<RegistrationsService>(RegistrationsService);
  });

  describe('Endpoint: create_registration', () => {
    it('creates registration for free event (no tickets tier), generates QR code and sends confirmation email', async () => {
      const mockEvent = {
        id: 'event-free',
        title: 'Free Workshop',
        location: 'Hall A',
        tickets: [],
      };
      prisma.post.findUnique.mockResolvedValue(mockEvent);
      prisma.registration.create.mockImplementation(({ data }) => Promise.resolve({ id: 'reg-1', ...data }));

      const dto = {
        eventId: 'event-free',
        attendeeName: 'John Doe',
        attendeeEmail: 'john@example.com',
      };

      const result = await controller.create({ dto, user: mockAttendeeUser });
      expect(result.id).toBe('reg-1');
      expect(result.paymentStatus).toBe('paid');
      expect(result.totalPaid).toBe(0);
      expect(result.qrCodeValue).toMatch(/^REG-/);
      expect(result.userId).toBe(mockAttendeeUser.firebaseId);
      expect(emailService.sendRegistrationEmail).toHaveBeenCalledWith(
        'john@example.com',
        'John Doe',
        mockEvent,
        expect.objectContaining({ id: 'reg-1', attendeeEmail: 'john@example.com' }),
        null,
      );
    });

    it('creates registration for virtual meeting and triggers registration email with meeting details', async () => {
      const mockVirtualEvent = {
        id: 'event-virtual',
        title: 'Online Tech Webinar',
        externalLink: 'https://meet.google.com/abc-defg-hij',
        location: 'Online Google Meet',
        tickets: [],
      };
      prisma.post.findUnique.mockResolvedValue(mockVirtualEvent);
      prisma.registration.create.mockImplementation(({ data }) => Promise.resolve({ id: 'reg-v1', ...data }));

      const dto = {
        eventId: 'event-virtual',
        attendeeName: 'Alice Smith',
        attendeeEmail: 'alice@example.com',
      };

      const result = await controller.create({ dto, user: mockAttendeeUser });
      expect(result.id).toBe('reg-v1');
      expect(emailService.sendRegistrationEmail).toHaveBeenCalledWith(
        'alice@example.com',
        'Alice Smith',
        mockVirtualEvent,
        expect.objectContaining({ id: 'reg-v1', attendeeEmail: 'alice@example.com' }),
        null,
      );
    });

    it('requires ticketId when in-person event has active ticket tiers', async () => {
      prisma.post.findUnique.mockResolvedValue({
        id: 'event-paid',
        location: 'Kigali Convention Centre',
        tickets: [{ id: 't1', isActive: true }],
      });

      const dto = {
        eventId: 'event-paid',
        attendeeName: 'John Doe',
        attendeeEmail: 'john@example.com',
      };

      await expect(controller.create({ dto, user: mockAttendeeUser })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('allows registration without ticketId for virtual event even if active tickets exist', async () => {
      const mockVirtualEvent = {
        id: 'event-virtual-paid',
        title: 'Virtual Summit',
        externalLink: 'https://zoom.us/j/123456789',
        tickets: [{ id: 't1', isActive: true }],
      };
      prisma.post.findUnique.mockResolvedValue(mockVirtualEvent);
      prisma.registration.create.mockImplementation(({ data }) => Promise.resolve({ id: 'reg-v2', ...data }));

      const dto = {
        eventId: 'event-virtual-paid',
        attendeeName: 'Bob User',
        attendeeEmail: 'bob@example.com',
      };

      const result = await controller.create({ dto, user: mockAttendeeUser });
      expect(result.id).toBe('reg-v2');
      expect(result.paymentStatus).toBe('paid');
      expect(result.totalPaid).toBe(0);
    });

    it('creates registration with ticket and sets pending status for priced tickets', async () => {
      prisma.post.findUnique.mockResolvedValue({
        id: 'event-paid',
        tickets: [{ id: 't1', isActive: true }],
      });
      prisma.ticket.findUnique.mockResolvedValue({
        id: 't1',
        eventId: 'event-paid',
        price: 50,
        quantity: 100,
        isActive: true,
      });
      prisma.registration.count.mockResolvedValue(10);
      prisma.registration.create.mockImplementation(({ data }) => Promise.resolve({ id: 'reg-2', ...data }));

      const dto = {
        eventId: 'event-paid',
        attendeeName: 'John Doe',
        attendeeEmail: 'john@example.com',
        ticketId: 't1',
      };

      const result = await controller.create({ dto, user: mockAttendeeUser });
      expect(result.totalPaid).toBe(50);
      expect(result.paymentStatus).toBe('pending');
      expect(result.qrCodeValue).toBeNull();
    });

    it('rejects registration when ticket tier is sold out', async () => {
      prisma.post.findUnique.mockResolvedValue({
        id: 'event-paid',
        tickets: [{ id: 't1', isActive: true }],
      });
      prisma.ticket.findUnique.mockResolvedValue({
        id: 't1',
        eventId: 'event-paid',
        price: 50,
        quantity: 10,
        isActive: true,
      });
      prisma.registration.count.mockResolvedValue(10); // 10 out of 10 used

      const dto = {
        eventId: 'event-paid',
        attendeeName: 'John Doe',
        attendeeEmail: 'john@example.com',
        ticketId: 't1',
      };

      await expect(controller.create({ dto, user: mockAttendeeUser })).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('validates schema with CreateRegistrationSchema', () => {
      const invalid = {
        dto: {
          eventId: 'ev-1',
          attendeeName: '',
          attendeeEmail: 'invalid-email',
        },
      };
      const { error } = CreateRegistrationSchema.validate(invalid);
      expect(error).toBeDefined();
    });
  });

  describe('Endpoint: find_all_registrations', () => {
    it('returns registrations for my events as Organizer', async () => {
      userService.getProfileAndSync.mockResolvedValue({ id: mockOrganizerUser.firebaseId, role: EventsRole.CONTENT_MANAGER });
      prisma.registration.findMany.mockResolvedValue([{ id: 'reg-1' }]);

      const result = await controller.findAll({ user: mockOrganizerUser });
      expect(result).toHaveLength(1);
      expect(prisma.registration.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { event: { authorId: mockOrganizerUser.firebaseId } },
        }),
      );
    });
  });

  describe('Endpoint: toggle_checkin', () => {
    it('checks in attendee idempotently', async () => {
      prisma.registration.findUnique.mockResolvedValue({
        id: 'reg-1',
        isCheckedIn: false,
        event: { authorId: mockOrganizerUser.firebaseId },
      });
      userService.getProfileAndSync.mockResolvedValue({ id: mockOrganizerUser.firebaseId, role: EventsRole.CONTENT_MANAGER });
      prisma.registration.update.mockResolvedValue({
        id: 'reg-1',
        isCheckedIn: true,
        checkedInAt: new Date(),
      });

      const result = await controller.toggleCheckIn({ id: 'reg-1', user: mockOrganizerUser });
      expect(result.isCheckedIn).toBe(true);
      expect(prisma.registration.update).toHaveBeenCalled();
    });

    it('returns without updating if already checked in', async () => {
      const alreadyCheckedIn = {
        id: 'reg-1',
        isCheckedIn: true,
        checkedInAt: new Date(),
        event: { authorId: mockOrganizerUser.firebaseId },
      };
      prisma.registration.findUnique.mockResolvedValue(alreadyCheckedIn);
      userService.getProfileAndSync.mockResolvedValue({ id: mockOrganizerUser.firebaseId, role: EventsRole.CONTENT_MANAGER });

      const result = await controller.toggleCheckIn({ id: 'reg-1', user: mockOrganizerUser });
      expect(result.isCheckedIn).toBe(true);
      expect(prisma.registration.update).not.toHaveBeenCalled();
    });
  });

  describe('Endpoint: find_my_tickets', () => {
    it('returns attendee tickets for logged in user', async () => {
      prisma.registration.findMany.mockResolvedValue([{ id: 'reg-1', userId: mockAttendeeUser.firebaseId }]);

      const result = await controller.findMyTickets({ user: mockAttendeeUser });
      expect(result).toHaveLength(1);
      expect(prisma.registration.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: mockAttendeeUser.firebaseId },
        }),
      );
    });
  });

  describe('Endpoint: find_event_attendees', () => {
    it('returns attendees for event when user is author', async () => {
      prisma.post.findUnique.mockResolvedValue({ id: 'ev-1', authorId: mockOrganizerUser.firebaseId });
      userService.getProfileAndSync.mockResolvedValue({ id: mockOrganizerUser.firebaseId, role: EventsRole.CONTENT_MANAGER });
      prisma.registration.findMany.mockResolvedValue([{ id: 'reg-1' }]);

      const result = await controller.findForEvent({ id: 'ev-1', user: mockOrganizerUser });
      expect(result).toHaveLength(1);
    });

    it('denies accessing attendees if not author and not admin', async () => {
      prisma.post.findUnique.mockResolvedValue({ id: 'ev-1', authorId: 'other-author' });
      userService.getProfileAndSync.mockResolvedValue({ id: mockOrganizerUser.firebaseId, role: EventsRole.CONTENT_MANAGER });

      await expect(controller.findForEvent({ id: 'ev-1', user: mockOrganizerUser })).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('Endpoint: checkin_attendee', () => {
    it('checks in attendee for specific event', async () => {
      prisma.registration.findUnique.mockResolvedValue({
        id: 'reg-1',
        eventId: 'ev-1',
        event: { authorId: mockOrganizerUser.firebaseId },
      });
      userService.getProfileAndSync.mockResolvedValue({ id: mockOrganizerUser.firebaseId, role: EventsRole.CONTENT_MANAGER });
      prisma.registration.update.mockResolvedValue({ id: 'reg-1', isCheckedIn: true });

      const result = await controller.checkIn({ id: 'ev-1', registrationId: 'reg-1', user: mockOrganizerUser });
      expect(result.isCheckedIn).toBe(true);
    });

    it('throws ForbiddenException if registration does not belong to event', async () => {
      prisma.registration.findUnique.mockResolvedValue({
        id: 'reg-1',
        eventId: 'different-event',
        event: { authorId: mockOrganizerUser.firebaseId },
      });

      await expect(
        controller.checkIn({ id: 'ev-1', registrationId: 'reg-1', user: mockOrganizerUser }),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
