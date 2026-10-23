import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedUser, UserService } from '../user/user.service';
import { CreateStudyGroupDto, JoinStudyGroupDto, UpdateStudyGroupDto } from './dto';

@Injectable()
export class StudyGroupsService {
  private readonly logger = new Logger(StudyGroupsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly userService: UserService,
  ) {}

  /**
   * Create a peer study group within a cohort (WAC Req 14).
   * Any enrolled student or instructor may create a group.
   */
  async create(dto: CreateStudyGroupDto, user: AuthenticatedUser) {
    await this.userService.getOrCreateProfile(user);

    // Verify the cohort exists
    const cohort = await this.prisma.cohort.findUnique({
      where: { id: dto.cohortId },
    });
    if (!cohort) throw new NotFoundException('Cohort not found');

    // Verify the user is enrolled in the cohort (or is instructor/admin)
    const enrollment = await this.prisma.enrollment.findFirst({
      where: { userId: user.firebaseId, cohortId: dto.cohortId },
    });
    const profile = await this.prisma.academyProfile.findUnique({
      where: { userId: user.firebaseId },
    });

    if (!enrollment && profile?.role !== 'ADMIN' && profile?.role !== 'INSTRUCTOR') {
      throw new ForbiddenException(
        'You must be enrolled in this cohort to create a study group.',
      );
    }

    const group = await this.prisma.studyGroup.create({
      data: {
        cohortId: dto.cohortId,
        name: dto.name,
        description: dto.description || null,
        meetingUrl: dto.meetingUrl || null,
      },
    });

    // Automatically add the creator as the LEADER
    await this.prisma.studyGroupMember.create({
      data: {
        studyGroupId: group.id,
        userId: user.firebaseId,
        role: 'LEADER',
      },
    });

    this.logger.log(
      `Study group "${group.name}" (ID: ${group.id}) created in cohort ${dto.cohortId} by user ${user.firebaseId}`,
    );

    return this.findOne(group.id);
  }

  /**
   * List all study groups in a cohort.
   */
  async findByCohort(cohortId: number, user: AuthenticatedUser) {
    await this.userService.getOrCreateProfile(user);

    const cohort = await this.prisma.cohort.findUnique({
      where: { id: cohortId },
    });
    if (!cohort) throw new NotFoundException('Cohort not found');

    return this.prisma.studyGroup.findMany({
      where: { cohortId },
      include: {
        members: {
          include: {
            profile: {
              select: { userId: true, role: true, specialization: true },
            },
          },
        },
        _count: { select: { members: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get a single study group with full member details.
   */
  async findOne(studyGroupId: number) {
    const group = await this.prisma.studyGroup.findUnique({
      where: { id: studyGroupId },
      include: {
        cohort: {
          select: { id: true, name: true, courseId: true },
        },
        members: {
          include: {
            profile: {
              select: { userId: true, role: true, specialization: true, bio: true },
            },
          },
          orderBy: { joinedAt: 'asc' },
        },
        _count: { select: { members: true } },
      },
    });

    if (!group) throw new NotFoundException('Study group not found');
    return group;
  }

  /**
   * Join an existing study group.
   * Only enrolled cohort members may join.
   */
  async join(dto: JoinStudyGroupDto, user: AuthenticatedUser) {
    await this.userService.getOrCreateProfile(user);

    const group = await this.prisma.studyGroup.findUnique({
      where: { id: dto.studyGroupId },
    });
    if (!group) throw new NotFoundException('Study group not found');

    // Verify enrollment in the same cohort
    const enrollment = await this.prisma.enrollment.findFirst({
      where: { userId: user.firebaseId, cohortId: group.cohortId },
    });
    const profile = await this.prisma.academyProfile.findUnique({
      where: { userId: user.firebaseId },
    });

    if (!enrollment && profile?.role !== 'ADMIN' && profile?.role !== 'INSTRUCTOR') {
      throw new ForbiddenException(
        'You must be enrolled in the same cohort to join this study group.',
      );
    }

    // Check for existing membership
    const existing = await this.prisma.studyGroupMember.findUnique({
      where: {
        studyGroupId_userId: {
          studyGroupId: dto.studyGroupId,
          userId: user.firebaseId,
        },
      },
    });
    if (existing) {
      throw new ConflictException('You are already a member of this study group.');
    }

    await this.prisma.studyGroupMember.create({
      data: {
        studyGroupId: dto.studyGroupId,
        userId: user.firebaseId,
        role: 'MEMBER',
      },
    });

    this.logger.log(
      `User ${user.firebaseId} joined study group ${dto.studyGroupId}`,
    );

    return this.findOne(dto.studyGroupId);
  }

  /**
   * Leave a study group.
   */
  async leave(studyGroupId: number, user: AuthenticatedUser) {
    await this.userService.getOrCreateProfile(user);

    const membership = await this.prisma.studyGroupMember.findUnique({
      where: {
        studyGroupId_userId: {
          studyGroupId,
          userId: user.firebaseId,
        },
      },
    });

    if (!membership) {
      throw new NotFoundException('You are not a member of this study group.');
    }

    await this.prisma.studyGroupMember.delete({
      where: { id: membership.id },
    });

    this.logger.log(
      `User ${user.firebaseId} left study group ${studyGroupId}`,
    );

    // If no members remain, delete the group
    const remainingCount = await this.prisma.studyGroupMember.count({
      where: { studyGroupId },
    });
    if (remainingCount === 0) {
      await this.prisma.studyGroup.delete({ where: { id: studyGroupId } });
      this.logger.log(`Study group ${studyGroupId} deleted (no remaining members)`);
      return { deleted: true, message: 'Study group removed (empty).' };
    }

    // If the leader left, promote the earliest remaining member
    if (membership.role === 'LEADER') {
      const nextLeader = await this.prisma.studyGroupMember.findFirst({
        where: { studyGroupId },
        orderBy: { joinedAt: 'asc' },
      });
      if (nextLeader) {
        await this.prisma.studyGroupMember.update({
          where: { id: nextLeader.id },
          data: { role: 'LEADER' },
        });
        this.logger.log(`Promoted user ${nextLeader.userId} to LEADER of study group ${studyGroupId}`);
      }
    }

    return this.findOne(studyGroupId);
  }

  /**
   * Update study group metadata (only LEADER or INSTRUCTOR/ADMIN).
   */
  async update(
    studyGroupId: number,
    dto: UpdateStudyGroupDto,
    user: AuthenticatedUser,
  ) {
    const profile = await this.userService.getOrCreateProfile(user);

    const group = await this.prisma.studyGroup.findUnique({
      where: { id: studyGroupId },
      include: { members: true },
    });
    if (!group) throw new NotFoundException('Study group not found');

    const isLeader = group.members.some(
      (m) => m.userId === user.firebaseId && m.role === 'LEADER',
    );
    const isPrivileged = profile.role === 'ADMIN' || profile.role === 'INSTRUCTOR';

    if (!isLeader && !isPrivileged) {
      throw new ForbiddenException(
        'Only the group leader or an instructor/admin can update this study group.',
      );
    }

    const updateData: Record<string, any> = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.meetingUrl !== undefined) updateData.meetingUrl = dto.meetingUrl;

    await this.prisma.studyGroup.update({
      where: { id: studyGroupId },
      data: updateData,
    });

    this.logger.log(`Study group ${studyGroupId} updated by user ${user.firebaseId}`);
    return this.findOne(studyGroupId);
  }

  /**
   * Delete a study group (only LEADER or INSTRUCTOR/ADMIN).
   */
  async remove(studyGroupId: number, user: AuthenticatedUser) {
    const profile = await this.userService.getOrCreateProfile(user);

    const group = await this.prisma.studyGroup.findUnique({
      where: { id: studyGroupId },
      include: { members: true },
    });
    if (!group) throw new NotFoundException('Study group not found');

    const isLeader = group.members.some(
      (m) => m.userId === user.firebaseId && m.role === 'LEADER',
    );
    const isPrivileged = profile.role === 'ADMIN' || profile.role === 'INSTRUCTOR';

    if (!isLeader && !isPrivileged) {
      throw new ForbiddenException(
        'Only the group leader or an instructor/admin can delete this study group.',
      );
    }

    await this.prisma.studyGroup.delete({ where: { id: studyGroupId } });

    this.logger.log(`Study group ${studyGroupId} deleted by user ${user.firebaseId}`);
    return { deleted: true, id: studyGroupId };
  }
}
