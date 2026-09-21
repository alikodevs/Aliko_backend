import { Test, TestingModule } from '@nestjs/testing';
import { PromotionRequestsController } from './promotion-requests.controller';
import { PromotionRequestsService } from './promotion-requests.service';
import { PrismaService } from '../database/prisma.service';
import { UserService, AuthenticatedUser } from '../user/user.service';
import { EventsRole } from '../generated/client';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { CreatePromotionRequestSchema } from './promotion-requests.validation';

describe('PromotionRequestsModule', () => {
  let controller: PromotionRequestsController;
  let service: PromotionRequestsService;
  let prisma: any;
  let userService: any;
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

  const mockSubmitterUser: AuthenticatedUser = {
    firebaseId: 'sub-123',
    email: 'sub@example.com',
    firstname: 'Submitter',
    lastname: 'User',
    role: 'USER',
    status: 'ACTIVE',
  };

  beforeEach(async () => {
    prisma = {
      promotionRequest: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      post: {
        create: jest.fn(),
      },
    };

    userService = {
      getProfileAndSync: jest.fn(),
    };

    authClient = {
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PromotionRequestsController],
      providers: [
        PromotionRequestsService,
        { provide: PrismaService, useValue: prisma },
        { provide: UserService, useValue: userService },
        { provide: 'AUTH_SERVICE', useValue: authClient },
      ],
    }).compile();

    controller = module.get<PromotionRequestsController>(PromotionRequestsController);
    service = module.get<PromotionRequestsService>(PromotionRequestsService);
  });

  describe('Endpoint: submit_promotion_request', () => {
    it('creates promotion request and emits contact email event to authClient', async () => {
      const dto = {
        companyName: 'Acme Corp',
        contactPerson: 'Alice',
        email: 'alice@acme.com',
        type: 'EVENT' as const,
        message: 'We want to sponsor/promote our annual tech conf',
      };

      prisma.promotionRequest.create.mockResolvedValue({ id: 'pr-1', ...dto, status: 'PENDING' });

      const result = await controller.create({ ...dto, userId: 'sub-123' });
      expect(result.id).toBe('pr-1');
      expect(prisma.promotionRequest.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            companyName: 'Acme Corp',
            userId: 'sub-123',
          }),
        }),
      );
      expect(authClient.emit).toHaveBeenCalledWith(
        'send_contact_email',
        expect.objectContaining({
          name: 'Alice',
          email: 'alice@acme.com',
        }),
      );
    });

    it('validates schema with CreatePromotionRequestSchema', () => {
      const invalid = {
        companyName: '',
        contactPerson: 'Alice',
        email: 'not-an-email',
        type: 'INVALID',
        message: '',
      };
      const { error } = CreatePromotionRequestSchema.validate(invalid);
      expect(error).toBeDefined();
    });
  });

  describe('Endpoint: find_my_promotion_requests', () => {
    it('returns requests for a specific user ID', async () => {
      prisma.promotionRequest.findMany.mockResolvedValue([{ id: 'pr-1', userId: 'sub-123' }]);

      const result = await controller.findMyRequests({ userId: 'sub-123' });
      expect(result).toHaveLength(1);
      expect(prisma.promotionRequest.findMany).toHaveBeenCalledWith({
        where: { userId: 'sub-123' },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('Endpoint: find_all_promotion_requests', () => {
    it('allows Admin to view all promotion requests', async () => {
      userService.getProfileAndSync.mockResolvedValue({ id: mockAdminUser.firebaseId, role: EventsRole.ADMIN });
      prisma.promotionRequest.findMany.mockResolvedValue([{ id: 'pr-1' }, { id: 'pr-2' }]);

      const result = await controller.findAll({ user: mockAdminUser });
      expect(result).toHaveLength(2);
    });

    it('denies non-admin viewing all requests', async () => {
      userService.getProfileAndSync.mockResolvedValue({ id: mockSubmitterUser.firebaseId, role: EventsRole.USER });

      await expect(controller.findAll({ user: mockSubmitterUser })).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('Endpoint: mark_promotion_request_reviewed', () => {
    it('allows Admin to mark request as reviewed', async () => {
      userService.getProfileAndSync.mockResolvedValue({ id: mockAdminUser.firebaseId, role: EventsRole.ADMIN });
      prisma.promotionRequest.findUnique.mockResolvedValue({ id: 'pr-1' });
      prisma.promotionRequest.update.mockResolvedValue({ id: 'pr-1', status: 'REVIEWED' });

      const result = await controller.markAsReviewed({ id: 'pr-1', user: mockAdminUser });
      expect(result.status).toBe('REVIEWED');
    });
  });

  describe('Endpoint: convert_promotion_to_event', () => {
    it('allows Admin to convert proposal to draft post and mark as CONVERTED', async () => {
      userService.getProfileAndSync.mockResolvedValue({ id: mockAdminUser.firebaseId, role: EventsRole.ADMIN });
      prisma.promotionRequest.findUnique.mockResolvedValue({
        id: 'pr-1',
        type: 'EVENT',
        companyName: 'Acme',
        contactPerson: 'Alice',
        message: 'Details',
      });
      prisma.post.create.mockResolvedValue({ id: 'post-new', title: 'Draft: Acme Event', status: 'DRAFT' });
      prisma.promotionRequest.update.mockResolvedValue({ id: 'pr-1', status: 'CONVERTED' });

      const result = await controller.convertToEvent({ id: 'pr-1', user: mockAdminUser });
      expect(result.id).toBe('post-new');
      expect(prisma.promotionRequest.update).toHaveBeenCalledWith({
        where: { id: 'pr-1' },
        data: { status: 'CONVERTED' },
      });
    });
  });
});
