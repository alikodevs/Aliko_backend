import { Test, TestingModule } from '@nestjs/testing';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';
import { PrismaService } from '../database/prisma.service';
import { UserService, AuthenticatedUser } from '../user/user.service';
import { EventsRole, PostType } from '../generated/client';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { CreateTicketSchema, TicketIdSchema } from './tickets.validation';

describe('TicketsModule (TicketsController & TicketsService)', () => {
  let controller: TicketsController;
  let service: TicketsService;
  let prisma: any;
  let userService: any;

  const mockAdminUser: AuthenticatedUser = {
    firebaseId: 'admin-123',
    email: 'admin@example.com',
    firstname: 'Admin',
    lastname: 'User',
    role: 'ADMIN',
    globalRole: 'ADMIN',
    status: 'ACTIVE',
  };

  const mockCmUser: AuthenticatedUser = {
    firebaseId: 'cm-123',
    email: 'cm@example.com',
    firstname: 'Content',
    lastname: 'Manager',
    role: 'CONTENT_MANAGER',
    status: 'ACTIVE',
  };

  const mockOtherUser: AuthenticatedUser = {
    firebaseId: 'other-123',
    email: 'other@example.com',
    firstname: 'Other',
    lastname: 'User',
    role: 'USER',
    status: 'ACTIVE',
  };

  beforeEach(async () => {
    prisma = {
      post: {
        findUnique: jest.fn(),
      },
      ticket: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      registration: {
        count: jest.fn(),
      },
    };

    userService = {
      getProfileAndSync: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TicketsController],
      providers: [
        TicketsService,
        { provide: PrismaService, useValue: prisma },
        { provide: UserService, useValue: userService },
      ],
    }).compile();

    controller = module.get<TicketsController>(TicketsController);
    service = module.get<TicketsService>(TicketsService);
  });

  describe('Endpoint: create_ticket', () => {
    it('creates a ticket when user is event author and event is PostType.EVENT', async () => {
      userService.getProfileAndSync.mockResolvedValue({ id: mockCmUser.firebaseId, role: EventsRole.CONTENT_MANAGER });
      prisma.post.findUnique.mockResolvedValue({
        id: 'event-1',
        authorId: mockCmUser.firebaseId,
        type: PostType.EVENT,
      });
      prisma.ticket.create.mockResolvedValue({
        id: 'ticket-1',
        eventId: 'event-1',
        name: 'VIP Pass',
        price: 99.99,
        quantity: 50,
      });

      const dto = {
        eventId: 'event-1',
        name: 'VIP Pass',
        price: 99.99,
        quantity: 50,
      };

      const result = await controller.create({ dto, user: mockCmUser });
      expect(result.id).toBe('ticket-1');
      expect(prisma.ticket.create).toHaveBeenCalledWith({ data: dto });
    });

    it('rejects creating ticket if event is SOCIAL_EVENT', async () => {
      userService.getProfileAndSync.mockResolvedValue({ id: mockCmUser.firebaseId, role: EventsRole.CONTENT_MANAGER });
      prisma.post.findUnique.mockResolvedValue({
        id: 'event-social',
        authorId: mockCmUser.firebaseId,
        type: PostType.SOCIAL_EVENT,
      });

      const dto = {
        eventId: 'event-social',
        name: 'Ticket',
        price: 10,
        quantity: 10,
      };

      await expect(controller.create({ dto, user: mockCmUser })).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('rejects creating ticket if event not found', async () => {
      userService.getProfileAndSync.mockResolvedValue({ id: mockCmUser.firebaseId, role: EventsRole.CONTENT_MANAGER });
      prisma.post.findUnique.mockResolvedValue(null);

      const dto = {
        eventId: 'non-existing',
        name: 'Ticket',
        price: 10,
        quantity: 10,
      };

      await expect(controller.create({ dto, user: mockCmUser })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('rejects creating ticket if user is not author and not admin', async () => {
      userService.getProfileAndSync.mockResolvedValue({ id: mockCmUser.firebaseId, role: EventsRole.CONTENT_MANAGER });
      prisma.post.findUnique.mockResolvedValue({
        id: 'event-1',
        authorId: 'another-author',
        type: PostType.EVENT,
      });

      const dto = {
        eventId: 'event-1',
        name: 'Ticket',
        price: 10,
        quantity: 10,
      };

      await expect(controller.create({ dto, user: mockCmUser })).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('validates schema with CreateTicketSchema', () => {
      const invalid = {
        dto: {
          eventId: 'ev-1',
          name: '',
          price: -5,
        },
        user: mockAdminUser,
      };
      const { error } = CreateTicketSchema.validate(invalid);
      expect(error).toBeDefined();
    });
  });

  describe('Endpoint: find_event_tickets', () => {
    it('returns all active tickets for an event ordered by price asc', async () => {
      prisma.ticket.findMany.mockResolvedValue([
        { id: 't1', price: 0 },
        { id: 't2', price: 50 },
      ]);

      const result = await controller.findAll({ eventId: 'event-1' });
      expect(result).toHaveLength(2);
      expect(prisma.ticket.findMany).toHaveBeenCalledWith({
        where: { eventId: 'event-1', isActive: true },
        orderBy: { price: 'asc' },
      });
    });
  });

  describe('Endpoint: find_all_tickets', () => {
    it('returns tickets for own events when user is Content Manager', async () => {
      userService.getProfileAndSync.mockResolvedValue({ id: mockCmUser.firebaseId, role: EventsRole.CONTENT_MANAGER });
      prisma.ticket.findMany.mockResolvedValue([{ id: 't1' }]);

      const result = await controller.findAllForUser({ user: mockCmUser });
      expect(result).toHaveLength(1);
      expect(prisma.ticket.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isActive: true, event: { authorId: mockCmUser.firebaseId } },
        }),
      );
    });

    it('returns all tickets when user is Admin', async () => {
      userService.getProfileAndSync.mockResolvedValue({ id: mockAdminUser.firebaseId, role: EventsRole.ADMIN });
      prisma.ticket.findMany.mockResolvedValue([{ id: 't1' }, { id: 't2' }]);

      const result = await controller.findAllForUser({ user: mockAdminUser });
      expect(result).toHaveLength(2);
      expect(prisma.ticket.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isActive: true },
        }),
      );
    });
  });

  describe('Endpoint: update_ticket', () => {
    it('allows author to update ticket', async () => {
      prisma.ticket.findUnique.mockResolvedValue({
        id: 'ticket-1',
        event: { authorId: mockCmUser.firebaseId },
      });
      userService.getProfileAndSync.mockResolvedValue({ id: mockCmUser.firebaseId, role: EventsRole.CONTENT_MANAGER });
      prisma.ticket.update.mockResolvedValue({ id: 'ticket-1', price: 75 });

      const result = await controller.update({
        id: 'ticket-1',
        dto: { price: 75 },
        user: mockCmUser,
      });

      expect(result.price).toBe(75);
    });

    it('throws NotFoundException if ticket does not exist', async () => {
      prisma.ticket.findUnique.mockResolvedValue(null);

      await expect(
        controller.update({
          id: 'ticket-none',
          dto: { price: 75 },
          user: mockCmUser,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('denies updating if user is not author and not admin', async () => {
      prisma.ticket.findUnique.mockResolvedValue({
        id: 'ticket-1',
        event: { authorId: 'other-author' },
      });
      userService.getProfileAndSync.mockResolvedValue({ id: mockCmUser.firebaseId, role: EventsRole.CONTENT_MANAGER });

      await expect(
        controller.update({
          id: 'ticket-1',
          dto: { price: 75 },
          user: mockCmUser,
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('Endpoint: remove_ticket', () => {
    it('performs soft delete (isActive: false) when registrations exist', async () => {
      prisma.ticket.findUnique.mockResolvedValue({
        id: 'ticket-1',
        event: { authorId: mockCmUser.firebaseId },
      });
      userService.getProfileAndSync.mockResolvedValue({ id: mockCmUser.firebaseId, role: EventsRole.CONTENT_MANAGER });
      prisma.registration.count.mockResolvedValue(5);
      prisma.ticket.update.mockResolvedValue({ id: 'ticket-1', isActive: false });

      const result = await controller.remove({ id: 'ticket-1', user: mockCmUser });
      expect(result.isActive).toBe(false);
      expect(prisma.ticket.update).toHaveBeenCalledWith({
        where: { id: 'ticket-1' },
        data: { isActive: false },
      });
    });

    it('performs hard delete when no registrations exist', async () => {
      prisma.ticket.findUnique.mockResolvedValue({
        id: 'ticket-2',
        event: { authorId: mockCmUser.firebaseId },
      });
      userService.getProfileAndSync.mockResolvedValue({ id: mockCmUser.firebaseId, role: EventsRole.CONTENT_MANAGER });
      prisma.registration.count.mockResolvedValue(0);
      prisma.ticket.delete.mockResolvedValue({ id: 'ticket-2' });

      const result = await controller.remove({ id: 'ticket-2', user: mockCmUser });
      expect(result.id).toBe('ticket-2');
      expect(prisma.ticket.delete).toHaveBeenCalledWith({
        where: { id: 'ticket-2' },
      });
    });
  });
});
