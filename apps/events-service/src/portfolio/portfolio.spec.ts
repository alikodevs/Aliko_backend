import { Test, TestingModule } from '@nestjs/testing';
import { PortfolioController } from './portfolio.controller';
import { PortfolioService } from './portfolio.service';
import { PrismaService } from '../database/prisma.service';
import { UserService, AuthenticatedUser } from '../user/user.service';
import { EventsRole } from '../generated/client';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { CreatePortfolioSchema } from './portfolio.validation';

describe('PortfolioModule (PortfolioController & PortfolioService)', () => {
  let controller: PortfolioController;
  let service: PortfolioService;
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
      portfolioMedia: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        delete: jest.fn(),
      },
    };

    userService = {
      getProfileAndSync: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PortfolioController],
      providers: [
        PortfolioService,
        { provide: PrismaService, useValue: prisma },
        { provide: UserService, useValue: userService },
      ],
    }).compile();

    controller = module.get<PortfolioController>(PortfolioController);
    service = module.get<PortfolioService>(PortfolioService);
  });

  describe('Endpoint: create_portfolio', () => {
    it('creates portfolio media for Admin / Content Manager', async () => {
      userService.getProfileAndSync.mockResolvedValue({ id: mockAdminUser.firebaseId, role: EventsRole.ADMIN });
      prisma.portfolioMedia.create.mockResolvedValue({
        id: 'pm-1',
        title: 'Gala Highlight',
        portal: 'social',
        mediaType: 'image',
        mediaUrl: 'https://cdn.example.com/gala.jpg',
      });

      const dto = {
        portal: 'social' as const,
        category: 'Gala',
        title: 'Gala Highlight',
        mediaType: 'image' as const,
        mediaUrl: 'https://cdn.example.com/gala.jpg',
      };

      const result = await controller.create({ dto, user: mockAdminUser });
      expect(result.id).toBe('pm-1');
      expect(prisma.portfolioMedia.create).toHaveBeenCalledWith({
        data: {
          ...dto,
          createdBy: mockAdminUser.firebaseId,
        },
      });
    });

    it('denies regular user adding portfolio media', async () => {
      userService.getProfileAndSync.mockResolvedValue({ id: mockRegularUser.firebaseId, role: EventsRole.USER });

      const dto = {
        portal: 'social' as const,
        category: 'Gala',
        title: 'Gala Highlight',
        mediaType: 'image' as const,
        mediaUrl: 'https://cdn.example.com/gala.jpg',
      };

      await expect(controller.create({ dto, user: mockRegularUser })).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('validates schema with CreatePortfolioSchema', () => {
      const invalid = {
        dto: {
          portal: 'invalid-portal',
          title: '',
          mediaType: 'audio',
        },
        user: mockAdminUser,
      };
      const { error } = CreatePortfolioSchema.validate(invalid);
      expect(error).toBeDefined();
    });
  });

  describe('Endpoint: find_all_portfolio', () => {
    it('finds media filtered by portal', async () => {
      prisma.portfolioMedia.findMany.mockResolvedValue([{ id: 'pm-1', portal: 'professional' }]);

      const result = await controller.findAll({ portal: 'professional' });
      expect(result).toHaveLength(1);
      expect(prisma.portfolioMedia.findMany).toHaveBeenCalledWith({
        where: { portal: 'professional' },
        orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
      });
    });
  });

  describe('Endpoint: remove_portfolio', () => {
    it('allows Admin to remove media', async () => {
      userService.getProfileAndSync.mockResolvedValue({ id: mockAdminUser.firebaseId, role: EventsRole.ADMIN });
      prisma.portfolioMedia.findUnique.mockResolvedValue({ id: 'pm-1' });
      prisma.portfolioMedia.delete.mockResolvedValue({ id: 'pm-1' });

      const result = await controller.remove({ id: 'pm-1', user: mockAdminUser });
      expect(result.id).toBe('pm-1');
    });

    it('throws NotFoundException if media not found', async () => {
      userService.getProfileAndSync.mockResolvedValue({ id: mockAdminUser.firebaseId, role: EventsRole.ADMIN });
      prisma.portfolioMedia.findUnique.mockResolvedValue(null);

      await expect(controller.remove({ id: 'pm-none', user: mockAdminUser })).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
