import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PostStatus, PostType, EventsRole } from "../generated/client";
import { PrismaService } from "../database/prisma.service";
import { CreatePostDto } from "./dto/create-post.dto";
import { UpdatePostDto } from "./dto/update-post.dto";
import { AuthenticatedUser, UserService } from "../user/user.service";

@Injectable()
export class PostsService {
  constructor(
    private prisma: PrismaService,
    private userService: UserService,
  ) {}

  async create(createPostDto: CreatePostDto, user: AuthenticatedUser) {
    const profile = await this.userService.getProfileAndSync(user);

    if (
      !profile ||
      (createPostDto.type !== PostType.SOCIAL_EVENT &&
        profile.role !== EventsRole.ADMIN &&
        profile.role !== EventsRole.CONTENT_MANAGER)
    ) {
      throw new ForbiddenException(
        "Only Content Managers and Admins can create professional content.",
      );
    }

    const status =
      (createPostDto.status as PostStatus) ||
      (createPostDto.type === PostType.SOCIAL_EVENT
        ? PostStatus.PUBLISHED
        : PostStatus.DRAFT);


    const parseDate = (dateStr: string | undefined | null) => {
      if (!dateStr || dateStr === "" || dateStr === "null") return null;
      const date = new Date(dateStr);
      return isNaN(date.getTime()) ? null : date;
    };

    return this.prisma.post.create({
      data: {
        ...createPostDto,
        authorId: user.firebaseId,
        status,
        eventDate: parseDate(createPostDto.eventDate),
        endEventDate: parseDate(createPostDto.endEventDate),
      },
    });
  }

  async findAll(query: {
    type?: PostType;
    status?: PostStatus;
    authorId?: string;
    page?: number;
    limit?: number;
    public?: boolean;
    user?: AuthenticatedUser;
  }) {
    const {
      type,
      status,
      authorId,
      page = 1,
      limit = 10,
      public: isPublic = false,
      user,
    } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (type) where.type = type;

    // Apply role-based filtering for non-public requests
    if (!isPublic && user) {
      const profile = await this.userService.getProfileAndSync(user);
      const isPrivileged =
        (profile &&
          (profile.role === EventsRole.ADMIN ||
            profile.role === EventsRole.CONTENT_MANAGER)) ||
        user.globalRole === "ADMIN" ||
        user.role === "ADMIN" ||
        (user as any).eventsRole === "ADMIN";

      if (!isPrivileged) {
        // Regular users only see their own posts in management view
        where.authorId = user.firebaseId;
      } else if (authorId) {
        // Privileged users can filter by authorId if they want
        where.authorId = authorId;
      }
    } else if (authorId) {
      // For public requests, we still allow filtering by authorId if provided
      where.authorId = authorId;
    }

    // Public requests only see PUBLISHED content
    if (isPublic) {
      where.status = PostStatus.PUBLISHED;
    } else if (status) {
      where.status = status;
    }

    const [items, total] = await Promise.all([
      this.prisma.post.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ createdAt: "desc" }],
      }),
      this.prisma.post.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string, isPublic = false) {
    const post = await this.prisma.post.findUnique({
      where: { id },
      include: {
        sessions: true,
        tickets: {
          where: { isActive: true },
        },
        sponsors: true,
        rsvps: !isPublic, // Only show RSVPs to admin/author
      },
    });

    if (!post) throw new NotFoundException("Post not found");

    if (isPublic && post.status !== PostStatus.PUBLISHED) {
      throw new ForbiddenException("Post is not published");
    }

    return post;
  }

  async update(
    id: string,
    updatePostDto: UpdatePostDto,
    user: AuthenticatedUser,
  ) {
    const post = await this.findOne(id);
    const profile = await this.userService.getProfileAndSync(user);

    if (!profile) {
      throw new ForbiddenException("Permission denied.");
    }

    if (profile.role === EventsRole.ADMIN) {
      // Admins can update anything
    } else if (profile.role === EventsRole.CONTENT_MANAGER) {
      if (post.authorId !== user.firebaseId) {
        throw new ForbiddenException("You can only update your own drafts.");
      }
      if (
        post.status === PostStatus.PUBLISHED ||
        post.status === PostStatus.APPROVED
      ) {
        throw new ForbiddenException(
          "Cannot edit a post once it has been approved or published.",
        );
      }
    } else {
      throw new ForbiddenException("Permission denied.");
    }

    const parseDate = (dateStr: string | undefined | null) => {
      if (!dateStr || dateStr === "" || dateStr === "null") return null;
      const date = new Date(dateStr);
      return isNaN(date.getTime()) ? null : date;
    };

    const updateData: any = { ...updatePostDto };
    if (profile.role !== EventsRole.ADMIN) {
      delete updateData.status;
    }
    if (updateData.eventDate !== undefined)
      updateData.eventDate = parseDate(updateData.eventDate);
    if (updateData.endEventDate !== undefined)
      updateData.endEventDate = parseDate(updateData.endEventDate);
    if (updateData.publishDate !== undefined)
      updateData.publishDate = parseDate(updateData.publishDate);

    // If CM updates a rejected post, it resets rejection reason
    if (
      profile.role === EventsRole.CONTENT_MANAGER &&
      post.status === PostStatus.REJECTED
    ) {
      updateData.rejectionReason = null;
    }

    return this.prisma.post.update({
      where: { id },
      data: updateData,
    });
  }

  async submitForReview(id: string, user: AuthenticatedUser) {
    const post = await this.findOne(id);

    if (post.authorId !== user.firebaseId) {
      throw new ForbiddenException("You can only submit your own posts.");
    }

    if (
      post.status !== PostStatus.DRAFT &&
      post.status !== PostStatus.REJECTED
    ) {
      throw new ForbiddenException(
        "Only drafts or rejected posts can be submitted for review.",
      );
    }

    return this.prisma.post.update({
      where: { id },
      data: {
        status: PostStatus.PENDING,
        rejectionReason: null,
      },
    });
  }

  async review(
    id: string,
    status: PostStatus,
    rejectionReason: string | null,
    user: AuthenticatedUser,
  ) {
    const profile = await this.userService.getProfileAndSync(user);
    if (!profile || profile.role !== EventsRole.ADMIN) {
      throw new ForbiddenException(
        "Only Admins can review and publish content.",
      );
    }

    // APPROVED is treated as PUBLISHED so content goes live (no dead-end status).
    const effectiveStatus =
      status === PostStatus.APPROVED ? PostStatus.PUBLISHED : status;

    const data: any = { status: effectiveStatus };
    if (effectiveStatus === PostStatus.REJECTED) {
      data.rejectionReason = rejectionReason;
    } else if (effectiveStatus === PostStatus.PUBLISHED) {
      data.publishDate = new Date();
      data.rejectionReason = null;
    }

    return this.prisma.post.update({
      where: { id },
      data,
    });
  }

  async getLandingInfo() {
    const [featured, announcements, portfolio, counts] = await Promise.all([
      this.prisma.post.findMany({
        where: { status: PostStatus.PUBLISHED, type: PostType.EVENT },
        orderBy: [{ eventDate: "asc" }, { publishDate: "desc" }],
        take: 6,
        select: {
          id: true,
          title: true,
          excerpt: true,
          coverImage: true,
          eventDate: true,
          endEventDate: true,
          location: true,
          type: true,
          status: true,
        },
      }),
      this.prisma.post.findMany({
        where: {
          status: PostStatus.PUBLISHED,
          type: { in: [PostType.ANNOUNCEMENT, PostType.NEWS] },
        },
        orderBy: { publishDate: "desc" },
        take: 5,
        select: {
          id: true,
          title: true,
          excerpt: true,
          coverImage: true,
          publishDate: true,
          type: true,
        },
      }),
      this.prisma.portfolioMedia.findMany({
        orderBy: { sortOrder: "asc" },
        take: 8,
      }),
      this.prisma.post.groupBy({
        by: ["type"],
        where: { status: PostStatus.PUBLISHED },
        _count: { _all: true },
      }),
    ]);

    const byType = Object.fromEntries(
      counts.map((c) => [c.type, c._count._all]),
    );

    return {
      featured,
      announcements,
      portfolio,
      counts: {
        events: byType[PostType.EVENT] || 0,
        socialEvents: byType[PostType.SOCIAL_EVENT] || 0,
        announcements: byType[PostType.ANNOUNCEMENT] || 0,
        news: byType[PostType.NEWS] || 0,
      },
    };
  }

  async remove(id: string, user: AuthenticatedUser) {
    const post = await this.findOne(id);
    const profile = await this.userService.getProfileAndSync(user);

    if (
      !profile ||
      (profile.role !== EventsRole.ADMIN && post.authorId !== user.firebaseId)
    ) {
      throw new ForbiddenException(
        "Only the author or an Admin can delete this post.",
      );
    }

    return this.prisma.post.delete({ where: { id } });
  }

  async getStats(user: AuthenticatedUser) {
    const profile = await this.userService.getProfileAndSync(user);
    if (!profile) throw new ForbiddenException("No events profile found.");

    const isInternal =
      profile.role === EventsRole.ADMIN ||
      profile.role === EventsRole.CONTENT_MANAGER;
    if (!isInternal) throw new ForbiddenException("Access denied.");

    const where: any = {};
    if (profile.role !== EventsRole.ADMIN) {
      where.authorId = user.firebaseId;
    }

    const events = await this.prisma.post.findMany({
      where,
      select: {
        id: true,
        type: true,
        registrations: {
          select: {
            totalPaid: true,
            isCheckedIn: true,
          },
        },
        rsvps: {
          select: {
            id: true,
          },
        },
      },
    });

    const stats = {
      proEvents: 0,
      socialEvents: 0,
      totalReg: 0,
      totalRsvp: 0,
      revenue: 0,
      checkedIn: 0,
    };

    events.forEach((e) => {
      if (e.type === PostType.EVENT) {
        stats.proEvents++;
      } else if (e.type === PostType.SOCIAL_EVENT) {
        stats.socialEvents++;
      }

      stats.totalReg += e.registrations.length;
      stats.totalRsvp += e.rsvps.length;
      stats.revenue += e.registrations.reduce(
        (sum, r) => sum + (r.totalPaid || 0),
        0,
      );
      stats.checkedIn += e.registrations.filter((r) => r.isCheckedIn).length;
    });

    return stats;
  }

  async getEventStats(id: string, user: AuthenticatedUser) {
    const post = await this.prisma.post.findUnique({
      where: { id },
      include: {
        registrations: true,
      },
    });

    if (!post) throw new NotFoundException("Event not found");

    const profile = await this.userService.getProfileAndSync(user);
    if (
      !profile ||
      (profile.role !== EventsRole.ADMIN && post.authorId !== user.firebaseId)
    ) {
      throw new ForbiddenException("Permission denied.");
    }

    const registrations = post.registrations.length;
    const revenue = post.registrations.reduce(
      (sum, r) => sum + (r.totalPaid || 0),
      0,
    );
    const checkedIn = post.registrations.filter((r) => r.isCheckedIn).length;

    return {
      views: 0, // Placeholder as views are not tracked in schema
      registrations,
      revenue,
      checkedIn,
      conversionRate: 0, // Needs views to calculate
    };
  }
}
