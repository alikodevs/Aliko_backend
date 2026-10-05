import { Test, TestingModule } from '@nestjs/testing';
import { SponsorsController } from './sponsors.controller';
import { SponsorsService } from './sponsors.service';
import { PrismaService } from '../database/prisma.service';
import { UserService, AuthenticatedUser } from '../user/user.service';
import { EventsRole } from '../generated/client';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { CreateSponsorSchema, SponsorIdSchema } from './sponsors.validation';

describe('SponsorsModule (SponsorsController & SponsorsService)', () => {
  let controller: SponsorsController;
  let service: SponsorsService;
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
      sponsor: {
        create: jest.fn(),
        findUnique: jest.fn(),
        delete: jest.fn(),
      },
    };

    userService = {
      getProfileAndSync: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SponsorsController],
      providers: [
        SponsorsService,
        { provide: PrismaService, useValue: prisma },
        { provide: UserService, useValue: userService },
      ],
    }).compile();

    controller = module.get<SponsorsController>(SponsorsController);
    service = module.get<SponsorsService>(SponsorsService);
  });

  describe('Endpoint: create_sponsor', () => {
    it('creates sponsor for event when user is author', async () => {
      prisma.post.findUnique.mockResolvedValue({ id: 'ev-1', authorId: mockOrganizerUser.firebaseId });
      userService.getProfileAndSync.mockResolvedValue({ id: mockOrganizerUser.firebaseId, role: EventsRole.CONTENT_MANAGER });
      prisma.sponsor.create.mockResolvedValue({
        id: 'spons-1',
        eventId: 'ev-1',
        name: 'Google Cloud',
        tier: 'Platinum',
      });

      const dto = {
        eventId: 'ev-1',
        name: 'Google Cloud',
        tier: 'Platinum',
      };

      const result = await controller.create({ dto, user: mockOrganizerUser });
      expect(result.id).toBe('spons-1');
      expect(prisma.sponsor.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            eventId: 'ev-1',
            name: 'Google Cloud',
            tier: 'Platinum',
          }),
        }),
      );
    });

    it('validates schema with CreateSponsorSchema', () => {
      const invalid = {
        dto: {
          eventId: 'ev-1',
          name: '',
        },
        user: mockOrganizerUser,
      };
      const { error } = CreateSponsorSchema.validate(invalid);
      expect(error).toBeDefined();
    });
  });

  describe('Endpoint: remove_sponsor', () => {
    it('removes sponsor when user is author', async () => {
      prisma.sponsor.findUnique.mockResolvedValue({ id: 'spons-1', eventId: 'ev-1' });
      prisma.post.findUnique.mockResolvedValue({ id: 'ev-1', authorId: mockOrganizerUser.firebaseId });
      userService.getProfileAndSync.mockResolvedValue({ id: mockOrganizerUser.firebaseId, role: EventsRole.CONTENT_MANAGER });
      prisma.sponsor.delete.mockResolvedValue({ id: 'spons-1' });

      const result = await controller.remove({ id: 'spons-1', user: mockOrganizerUser });
      expect(result.id).toBe('spons-1');
    });
  });
});
