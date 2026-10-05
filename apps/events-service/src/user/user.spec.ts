import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from './user.controller';
import { UserService, AuthenticatedUser } from './user.service';
import { PrismaService } from '../database/prisma.service';
import { EventsRole } from '../generated/client';
import { ForbiddenException } from '@nestjs/common';
import { of } from 'rxjs';
import { UpdateUserRoleSchema } from './user.validation';

describe('UserModule (UserController & UserService)', () => {
  let controller: UserController;
  let service: UserService;
  let prisma: any;
  let authClient: any;

  const mockAdminUser: AuthenticatedUser = {
    firebaseId: 'admin-123',
    email: 'admin@example.com',
    firstname: 'Admin',
    lastname: 'User',
    role: 'ADMIN',
    globalRole: 'ADMIN',
    status: 'ACTIVE',
  };

  const mockRegularUser: AuthenticatedUser = {
    firebaseId: 'user-123',
    email: 'user@example.com',
    firstname: 'Regular',
    lastname: 'User',
    role: 'USER',
    status: 'ACTIVE',
  };

  beforeEach(async () => {
    prisma = {
      eventsProfile: {
        findUnique: jest.fn(),
        create: jest.fn(),
        upsert: jest.fn(),
        findMany: jest.fn(),
        delete: jest.fn(),
      },
    };

    authClient = {
      send: jest.fn(),
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        UserService,
        { provide: PrismaService, useValue: prisma },
        { provide: 'AUTH_SERVICE', useValue: authClient },
      ],
    }).compile();

    controller = module.get<UserController>(UserController);
    service = module.get<UserService>(UserService);
  });

  describe('Endpoint: get_events_profile', () => {
    it('fetches profile and creates default USER role if not existing', async () => {
      authClient.send.mockReturnValue(of(null)); // syncFromAuth returns null
      prisma.eventsProfile.findUnique.mockResolvedValue(null);
      prisma.eventsProfile.create.mockResolvedValue({ id: mockRegularUser.firebaseId, role: EventsRole.USER });

      const profile = await controller.getProfile({ user: mockRegularUser });
      expect(profile).toBeDefined();
      expect(profile?.role).toBe(EventsRole.USER);
    });

    it('syncs ADMIN role when user is global ADMIN in auth', async () => {
      authClient.send.mockReturnValue(of({ globalRole: 'ADMIN' }));
      prisma.eventsProfile.upsert.mockResolvedValue({ id: mockAdminUser.firebaseId, role: EventsRole.ADMIN });
      prisma.eventsProfile.findUnique.mockResolvedValue({ id: mockAdminUser.firebaseId, role: EventsRole.ADMIN });

      const profile = await controller.getProfile({ user: mockAdminUser });
      expect(profile?.role).toBe(EventsRole.ADMIN);
    });
  });

  describe('Endpoint: update_user_role', () => {
    it('allows Admin to update another user role', async () => {
      authClient.send.mockReturnValue(of({ globalRole: 'ADMIN' }));
      prisma.eventsProfile.findUnique.mockResolvedValue({ id: mockAdminUser.firebaseId, role: EventsRole.ADMIN });
      prisma.eventsProfile.upsert.mockResolvedValue({ id: 'target-user', role: EventsRole.CONTENT_MANAGER });

      const result = await controller.updateRole({
        userId: 'target-user',
        role: EventsRole.CONTENT_MANAGER,
        user: mockAdminUser,
      });

      expect(result.role).toBe(EventsRole.CONTENT_MANAGER);
    });

    it('denies regular user updating roles', async () => {
      authClient.send.mockReturnValue(of(null));
      prisma.eventsProfile.findUnique.mockResolvedValue({ id: mockRegularUser.firebaseId, role: EventsRole.USER });

      await expect(
        controller.updateRole({
          userId: 'target-user',
          role: EventsRole.ADMIN,
          user: mockRegularUser,
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('Endpoint: get_all_profiles', () => {
    it('allows Admin to list all profiles', async () => {
      authClient.send.mockReturnValue(of({ globalRole: 'ADMIN' }));
      prisma.eventsProfile.findUnique.mockResolvedValue({ id: mockAdminUser.firebaseId, role: EventsRole.ADMIN });
      prisma.eventsProfile.findMany.mockResolvedValue([{ id: 'p1' }, { id: 'p2' }]);

      const result = await controller.getAllProfiles({ user: mockAdminUser });
      expect(result).toHaveLength(2);
    });
  });

  describe('Endpoint: delete_profile', () => {
    it('allows Admin to delete profile', async () => {
      authClient.send.mockReturnValue(of({ globalRole: 'ADMIN' }));
      prisma.eventsProfile.findUnique.mockResolvedValue({ id: mockAdminUser.firebaseId, role: EventsRole.ADMIN });
      prisma.eventsProfile.delete.mockResolvedValue({ id: 'user-delete' });

      const result = await controller.deleteProfile({ userId: 'user-delete', user: mockAdminUser });
      expect(result.id).toBe('user-delete');
    });
  });

  describe('Endpoint: get_user_role', () => {
    it('returns role for authenticated user', async () => {
      authClient.send.mockReturnValue(of(null));
      prisma.eventsProfile.findUnique.mockResolvedValue({ id: mockRegularUser.firebaseId, role: EventsRole.USER });

      const result = await controller.getUserRole({ user: mockRegularUser });
      expect(result.userId).toBe(mockRegularUser.firebaseId);
      expect(result.role).toBe(EventsRole.USER);
    });
  });

  describe('Endpoint: assign_role', () => {
    it('allows self-assigning ORGANIZER / CONTENT_MANAGER', async () => {
      authClient.send.mockReturnValue(of(null));
      prisma.eventsProfile.findUnique.mockResolvedValue({ id: mockRegularUser.firebaseId, role: EventsRole.USER });
      prisma.eventsProfile.upsert.mockResolvedValue({ id: mockRegularUser.firebaseId, role: EventsRole.CONTENT_MANAGER });

      const result = await controller.assignRole({
        dto: { requestedRole: 'ORGANIZER' },
        user: mockRegularUser,
      });

      expect(result.role).toBe(EventsRole.CONTENT_MANAGER);
    });

    it('denies self-assigning ADMIN for non-global-admin', async () => {
      authClient.send.mockReturnValue(of(null));
      prisma.eventsProfile.findUnique.mockResolvedValue({ id: mockRegularUser.firebaseId, role: EventsRole.USER });

      await expect(
        controller.assignRole({
          dto: { requestedRole: 'ADMIN' },
          user: mockRegularUser,
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('Event: user_created', () => {
    it('handles user_created event by syncing profile', async () => {
      authClient.send.mockReturnValue(of(null));
      prisma.eventsProfile.findUnique.mockResolvedValue(null);
      prisma.eventsProfile.create.mockResolvedValue({ id: 'new-user-1', role: EventsRole.USER });

      await controller.handleUserCreated({
        userId: 'new-user-1',
        email: 'new@example.com',
        role: 'USER',
      });

      expect(prisma.eventsProfile.create).toHaveBeenCalled();
    });
  });
});
