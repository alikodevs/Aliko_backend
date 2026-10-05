import { Test, TestingModule } from '@nestjs/testing';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';
import { PrismaService } from '../database/prisma.service';
import { UserService, AuthenticatedUser } from '../user/user.service';
import { EventsRole, PostStatus, PostType } from '../generated/client';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { CreatePostSchema, UpdatePostSchema, PostIdSchema, FindAllPostsSchema, ReviewPostSchema } from './posts.validation';

describe('PostsModule (PostsController & PostsService)', () => {
  let controller: PostsController;
  let service: PostsService;
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
      post: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
        groupBy: jest.fn(),
      },
      portfolioMedia: {
        findMany: jest.fn(),
      },
    };

    userService = {
      getProfileAndSync: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PostsController],
      providers: [
        PostsService,
        { provide: PrismaService, useValue: prisma },
        { provide: UserService, useValue: userService },
      ],
    }).compile();

    controller = module.get<PostsController>(PostsController);
    service = module.get<PostsService>(PostsService);
  });

  describe('Endpoint: create_post', () => {
    it('allows Admin to create professional event', async () => {
      userService.getProfileAndSync.mockResolvedValue({ id: mockAdminUser.firebaseId, role: EventsRole.ADMIN });
      prisma.post.create.mockResolvedValue({ id: 'post-1', title: 'Tech Summit', type: PostType.EVENT });

      const dto = {
        title: 'Tech Summit',
        type: PostType.EVENT,
        content: 'Tech Summit 2026 content',
      };

      const result = await controller.create({ dto: dto as any, user: mockAdminUser });
      expect(result.id).toBe('post-1');
      expect(prisma.post.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            title: 'Tech Summit',
            type: PostType.EVENT,
            authorId: mockAdminUser.firebaseId,
            status: PostStatus.DRAFT,
          }),
        }),
      );
    });

    it('allows Regular User to create SOCIAL_EVENT with PUBLISHED status', async () => {
      userService.getProfileAndSync.mockResolvedValue({ id: mockRegularUser.firebaseId, role: EventsRole.USER });
      prisma.post.create.mockResolvedValue({ id: 'social-1', title: 'Board Games', type: PostType.SOCIAL_EVENT });

      const dto = {
        title: 'Board Games Night',
        type: PostType.SOCIAL_EVENT,
        content: 'Bring your favourite game',
      };

      const result = await controller.create({ dto: dto as any, user: mockRegularUser });
      expect(result.id).toBe('social-1');
      expect(prisma.post.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: PostStatus.PUBLISHED,
          }),
        }),
      );
    });

    it('rejects Regular User trying to create professional EVENT', async () => {
      userService.getProfileAndSync.mockResolvedValue({ id: mockRegularUser.firebaseId, role: EventsRole.USER });

      const dto = {
        title: 'Unauthorized Pro Event',
        type: PostType.EVENT,
        content: 'Content',
      };

      await expect(
        controller.create({ dto: dto as any, user: mockRegularUser }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('validates payload with CreatePostSchema', () => {
      const invalidPayload = {
        dto: {
          type: 'INVALID_TYPE',
          title: '',
        },
        user: mockAdminUser,
      };
      const { error } = CreatePostSchema.validate(invalidPayload);
      expect(error).toBeDefined();
    });
  });

  describe('Endpoint: find_all_posts', () => {
    it('returns only PUBLISHED posts for public requests', async () => {
      prisma.post.findMany.mockResolvedValue([{ id: 'p1', status: PostStatus.PUBLISHED }]);
      prisma.post.count.mockResolvedValue(1);

      const result = await controller.findAll({ public: true, page: 1, limit: 10 });
      expect(result.items).toHaveLength(1);
      expect(prisma.post.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: PostStatus.PUBLISHED }),
        }),
      );
    });

    it('filters by authorId for regular users in management view', async () => {
      userService.getProfileAndSync.mockResolvedValue({ id: mockRegularUser.firebaseId, role: EventsRole.USER });
      prisma.post.findMany.mockResolvedValue([]);
      prisma.post.count.mockResolvedValue(0);

      await controller.findAll({ public: false, user: mockRegularUser });
      expect(prisma.post.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ authorId: mockRegularUser.firebaseId }),
        }),
      );
    });

    it('allows Admin to see all posts regardless of author', async () => {
      userService.getProfileAndSync.mockResolvedValue({ id: mockAdminUser.firebaseId, role: EventsRole.ADMIN });
      prisma.post.findMany.mockResolvedValue([]);
      prisma.post.count.mockResolvedValue(0);

      await controller.findAll({ public: false, user: mockAdminUser });
      expect(prisma.post.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {},
        }),
      );
    });
  });

  describe('Endpoint: find_one_post', () => {
    it('returns post with related sessions and tickets', async () => {
      const mockPost = {
        id: 'post-1',
        title: 'Summit',
        status: PostStatus.PUBLISHED,
        sessions: [],
        tickets: [{ id: 't1', isActive: true }],
        sponsors: [],
      };
      prisma.post.findUnique.mockResolvedValue(mockPost);

      const result = await controller.findOne({ id: 'post-1', public: true });
      expect(result.id).toBe('post-1');
    });

    it('throws NotFoundException when post does not exist', async () => {
      prisma.post.findUnique.mockResolvedValue(null);
      await expect(controller.findOne({ id: 'non-existing', public: false })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ForbiddenException when public request requests non-published post', async () => {
      prisma.post.findUnique.mockResolvedValue({
        id: 'post-draft',
        status: PostStatus.DRAFT,
      });

      await expect(controller.findOne({ id: 'post-draft', public: true })).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('Endpoint: update_post', () => {
    it('allows Admin to update any post', async () => {
      prisma.post.findUnique.mockResolvedValue({ id: 'p1', authorId: 'other-author', status: PostStatus.PUBLISHED });
      userService.getProfileAndSync.mockResolvedValue({ id: mockAdminUser.firebaseId, role: EventsRole.ADMIN });
      prisma.post.update.mockResolvedValue({ id: 'p1', title: 'Updated Title' });

      const result = await controller.update({
        id: 'p1',
        dto: { title: 'Updated Title' },
        user: mockAdminUser,
      });

      expect(result.title).toBe('Updated Title');
    });

    it('denies Content Manager updating another author draft', async () => {
      prisma.post.findUnique.mockResolvedValue({ id: 'p1', authorId: 'other-user', status: PostStatus.DRAFT });
      userService.getProfileAndSync.mockResolvedValue({ id: mockCmUser.firebaseId, role: EventsRole.CONTENT_MANAGER });

      await expect(
        controller.update({
          id: 'p1',
          dto: { title: 'Updated' },
          user: mockCmUser,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('denies Content Manager updating already published post', async () => {
      prisma.post.findUnique.mockResolvedValue({ id: 'p1', authorId: mockCmUser.firebaseId, status: PostStatus.PUBLISHED });
      userService.getProfileAndSync.mockResolvedValue({ id: mockCmUser.firebaseId, role: EventsRole.CONTENT_MANAGER });

      await expect(
        controller.update({
          id: 'p1',
          dto: { title: 'Updated' },
          user: mockCmUser,
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('Endpoint: submit_post_for_review', () => {
    it('submits a DRAFT post for review (changes status to PENDING)', async () => {
      prisma.post.findUnique.mockResolvedValue({ id: 'p1', authorId: mockCmUser.firebaseId, status: PostStatus.DRAFT });
      prisma.post.update.mockResolvedValue({ id: 'p1', status: PostStatus.PENDING, rejectionReason: null });

      const result = await controller.submitForReview({ id: 'p1', user: mockCmUser });
      expect(result.status).toBe(PostStatus.PENDING);
    });

    it('denies submitting if not the author', async () => {
      prisma.post.findUnique.mockResolvedValue({ id: 'p1', authorId: 'other-author', status: PostStatus.DRAFT });

      await expect(controller.submitForReview({ id: 'p1', user: mockCmUser })).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('denies submitting if already PUBLISHED or PENDING', async () => {
      prisma.post.findUnique.mockResolvedValue({ id: 'p1', authorId: mockCmUser.firebaseId, status: PostStatus.PUBLISHED });

      await expect(controller.submitForReview({ id: 'p1', user: mockCmUser })).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('Endpoint: review_post', () => {
    it('allows Admin to approve and publish a post', async () => {
      userService.getProfileAndSync.mockResolvedValue({ id: mockAdminUser.firebaseId, role: EventsRole.ADMIN });
      prisma.post.update.mockResolvedValue({ id: 'p1', status: PostStatus.PUBLISHED });

      const result = await controller.review({
        id: 'p1',
        status: PostStatus.APPROVED,
        user: mockAdminUser,
      });

      expect(result.status).toBe(PostStatus.PUBLISHED);
      expect(prisma.post.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: PostStatus.PUBLISHED }),
        }),
      );
    });

    it('allows Admin to reject a post with rejection reason', async () => {
      userService.getProfileAndSync.mockResolvedValue({ id: mockAdminUser.firebaseId, role: EventsRole.ADMIN });
      prisma.post.update.mockResolvedValue({ id: 'p1', status: PostStatus.REJECTED, rejectionReason: 'Incomplete info' });

      const result = await controller.review({
        id: 'p1',
        status: PostStatus.REJECTED,
        rejectionReason: 'Incomplete info',
        user: mockAdminUser,
      });

      expect(result.status).toBe(PostStatus.REJECTED);
      expect(result.rejectionReason).toBe('Incomplete info');
    });

    it('denies non-admin reviewing posts', async () => {
      userService.getProfileAndSync.mockResolvedValue({ id: mockCmUser.firebaseId, role: EventsRole.CONTENT_MANAGER });

      await expect(
        controller.review({
          id: 'p1',
          status: PostStatus.APPROVED,
          user: mockCmUser,
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('Endpoint: remove_post', () => {
    it('allows author to remove post', async () => {
      prisma.post.findUnique.mockResolvedValue({ id: 'p1', authorId: mockCmUser.firebaseId });
      userService.getProfileAndSync.mockResolvedValue({ id: mockCmUser.firebaseId, role: EventsRole.CONTENT_MANAGER });
      prisma.post.delete.mockResolvedValue({ id: 'p1' });

      const result = await controller.remove({ id: 'p1', user: mockCmUser });
      expect(result.id).toBe('p1');
    });

    it('allows Admin to remove any post', async () => {
      prisma.post.findUnique.mockResolvedValue({ id: 'p1', authorId: 'someone-else' });
      userService.getProfileAndSync.mockResolvedValue({ id: mockAdminUser.firebaseId, role: EventsRole.ADMIN });
      prisma.post.delete.mockResolvedValue({ id: 'p1' });

      const result = await controller.remove({ id: 'p1', user: mockAdminUser });
      expect(result.id).toBe('p1');
    });

    it('denies non-author non-admin deleting post', async () => {
      prisma.post.findUnique.mockResolvedValue({ id: 'p1', authorId: 'someone-else' });
      userService.getProfileAndSync.mockResolvedValue({ id: mockRegularUser.firebaseId, role: EventsRole.USER });

      await expect(controller.remove({ id: 'p1', user: mockRegularUser })).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('Endpoint: get_stats', () => {
    it('aggregates statistics for Admin', async () => {
      userService.getProfileAndSync.mockResolvedValue({ id: mockAdminUser.firebaseId, role: EventsRole.ADMIN });
      prisma.post.findMany.mockResolvedValue([
        {
          id: 'p1',
          type: PostType.EVENT,
          registrations: [{ totalPaid: 100, isCheckedIn: true }, { totalPaid: 50, isCheckedIn: false }],
          rsvps: [],
        },
        {
          id: 'p2',
          type: PostType.SOCIAL_EVENT,
          registrations: [],
          rsvps: [{ id: 'r1' }, { id: 'r2' }],
        },
      ]);

      const stats = await controller.getStats({ user: mockAdminUser });
      expect(stats.proEvents).toBe(1);
      expect(stats.socialEvents).toBe(1);
      expect(stats.totalReg).toBe(2);
      expect(stats.totalRsvp).toBe(2);
      expect(stats.revenue).toBe(150);
      expect(stats.checkedIn).toBe(1);
    });

    it('denies regular user accessing stats', async () => {
      userService.getProfileAndSync.mockResolvedValue({ id: mockRegularUser.firebaseId, role: EventsRole.USER });

      await expect(controller.getStats({ user: mockRegularUser })).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('Endpoint: get_landing_info', () => {
    it('returns landing page data', async () => {
      prisma.post.findMany.mockResolvedValueOnce([{ id: 'ev-1', title: 'Featured Event' }]);
      prisma.post.findMany.mockResolvedValueOnce([{ id: 'news-1', title: 'Breaking News' }]);
      prisma.portfolioMedia.findMany.mockResolvedValueOnce([{ id: 'm-1', title: 'Photo 1' }]);
      prisma.post.groupBy.mockResolvedValueOnce([
        { type: PostType.EVENT, _count: { _all: 5 } },
        { type: PostType.SOCIAL_EVENT, _count: { _all: 3 } },
      ]);

      const landing = await controller.getLandingInfo();
      expect(landing.featured).toHaveLength(1);
      expect(landing.announcements).toHaveLength(1);
      expect(landing.portfolio).toHaveLength(1);
      expect(landing.counts.events).toBe(5);
      expect(landing.counts.socialEvents).toBe(3);
    });
  });
});
