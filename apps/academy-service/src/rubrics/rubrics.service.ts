import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateRubricDto,
  UpdateRubricDto,
  ListRubricsDto,
  CloneRubricDto,
  EvaluateWithRubricDto,
  Rubric,
} from './dto';
import { RubricType } from '@prisma/client/academy';

@Injectable()
export class RubricsService {
  private readonly logger = new Logger(RubricsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateRubricDto): Promise<Rubric> {
    const rubricType = dto.type as RubricType;

    const created = await this.prisma.rubric.create({
      data: {
        name: dto.name,
        description: dto.description,
        type: rubricType,
        createdBy: userId,
        isActive: true,
        criteria: {
          create: (dto.criteria || []).map((c, cIndex) => ({
            title: c.title,
            description: c.description,
            maxPoints: c.maxPoints,
            order: c.order ?? cIndex,
            levels: {
              create: (c.levels || []).map((l, lIndex) => ({
                name: l.name,
                description: l.description,
                points: l.points,
                order: l.order ?? lIndex,
              })),
            },
          })),
        },
      },
      include: {
        criteria: {
          orderBy: { order: 'asc' },
          include: {
            levels: {
              orderBy: { order: 'asc' },
            },
          },
        },
      },
    });

    this.logger.log(`Created rubric ${created.id} by user ${userId}`);
    return created as unknown as Rubric;
  }

  async findAll(dto: ListRubricsDto) {
    const page = dto.page || 1;
    const limit = dto.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (dto.type) {
      where.type = dto.type as RubricType;
    }
    if (dto.isActive !== undefined) {
      where.isActive = dto.isActive;
    }
    if (dto.search) {
      where.OR = [
        { name: { contains: dto.search, mode: 'insensitive' } },
        { description: { contains: dto.search, mode: 'insensitive' } },
      ];
    }

    const [rubrics, total] = await Promise.all([
      this.prisma.rubric.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          criteria: {
            orderBy: { order: 'asc' },
            include: {
              levels: {
                orderBy: { order: 'asc' },
              },
            },
          },
        },
      }),
      this.prisma.rubric.count({ where }),
    ]);

    return {
      rubrics: rubrics as unknown as Rubric[],
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<Rubric> {
    const rubric = await this.prisma.rubric.findUnique({
      where: { id },
      include: {
        criteria: {
          orderBy: { order: 'asc' },
          include: {
            levels: {
              orderBy: { order: 'asc' },
            },
          },
        },
      },
    });

    if (!rubric) {
      throw new NotFoundException(`Rubric with ID ${id} not found`);
    }

    return rubric as unknown as Rubric;
  }

  async update(userId: string, dto: UpdateRubricDto): Promise<Rubric> {
    const existing = await this.prisma.rubric.findUnique({
      where: { id: dto.id },
    });

    if (!existing) {
      throw new NotFoundException(`Rubric with ID ${dto.id} not found`);
    }

    const updateData: any = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.type !== undefined) updateData.type = dto.type as RubricType;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;

    // If criteria are explicitly provided, replace existing criteria
    if (dto.criteria) {
      return this.prisma.$transaction(async (tx) => {
        // Delete old criteria (cascade deletes levels)
        await tx.rubricCriterion.deleteMany({
          where: { rubricId: dto.id },
        });

        // Recreate criteria and levels
        return tx.rubric.update({
          where: { id: dto.id },
          data: {
            ...updateData,
            criteria: {
              create: dto.criteria!.map((c, cIndex) => ({
                title: c.title,
                description: c.description,
                maxPoints: c.maxPoints,
                order: c.order ?? cIndex,
                levels: {
                  create: (c.levels || []).map((l, lIndex) => ({
                    name: l.name,
                    description: l.description,
                    points: l.points,
                    order: l.order ?? lIndex,
                  })),
                },
              })),
            },
          },
          include: {
            criteria: {
              orderBy: { order: 'asc' },
              include: {
                levels: {
                  orderBy: { order: 'asc' },
                },
              },
            },
          },
        });
      }) as unknown as Rubric;
    }

    const updated = await this.prisma.rubric.update({
      where: { id: dto.id },
      data: updateData,
      include: {
        criteria: {
          orderBy: { order: 'asc' },
          include: {
            levels: {
              orderBy: { order: 'asc' },
            },
          },
        },
      },
    });

    return updated as unknown as Rubric;
  }

  async remove(id: string): Promise<{ success: boolean; message: string }> {
    const existing = await this.prisma.rubric.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Rubric with ID ${id} not found`);
    }

    await this.prisma.rubric.delete({
      where: { id },
    });

    return { success: true, message: `Rubric ${id} successfully deleted` };
  }

  async clone(userId: string, dto: CloneRubricDto): Promise<Rubric> {
    const source = await this.findOne(dto.rubricId);

    const newName = dto.newName || `${source.name} (Copy)`;

    return this.create(userId, {
      name: newName,
      description: source.description,
      type: source.type,
      criteria: (source.criteria || []).map((c) => ({
        title: c.title,
        description: c.description,
        maxPoints: c.maxPoints,
        order: c.order,
        levels: (c.levels || []).map((l) => ({
          name: l.name,
          description: l.description,
          points: l.points,
          order: l.order,
        })),
      })),
    });
  }

  async evaluateWithRubric(dto: EvaluateWithRubricDto) {
    const rubric = await this.findOne(dto.rubricId);
    const criteriaMap = new Map((rubric.criteria || []).map((c) => [c.id, c]));

    let scores = dto.scores || dto.criteriaScores;
    if ((!scores || scores.length === 0) && dto.selectedLevelIds && Array.isArray(dto.selectedLevelIds)) {
      scores = [];
      for (const levelId of dto.selectedLevelIds) {
        let found = false;
        for (const crit of rubric.criteria || []) {
          const matched = (crit.levels || []).find((l) => l.id === levelId);
          if (matched) {
            scores.push({
              criterionId: crit.id,
              levelId: matched.id,
              points: matched.points,
              feedback: dto.customFeedback,
            });
            found = true;
            break;
          }
        }
      }
    }

    if (!scores || scores.length === 0) {
      throw new BadRequestException('Either scores or selectedLevelIds must be provided');
    }

    let totalEarned = 0;
    let totalPossible = 0;
    const evaluatedCriteria: any[] = [];

    for (const score of scores) {
      const criterion = criteriaMap.get(score.criterionId);
      if (!criterion) {
        throw new BadRequestException(
          `Criterion ID ${score.criterionId} does not belong to rubric ${dto.rubricId}`,
        );
      }

      if (score.points > criterion.maxPoints) {
        throw new BadRequestException(
          `Awarded points (${score.points}) exceed maximum allowable points (${criterion.maxPoints}) for criterion "${criterion.title}"`,
        );
      }

      let matchedLevel: any = null;
      if (score.levelId && criterion.levels) {
        matchedLevel = criterion.levels.find((l) => l.id === score.levelId);
      }

      totalEarned += score.points;
      totalPossible += criterion.maxPoints;

      evaluatedCriteria.push({
        criterionId: criterion.id,
        criterionTitle: criterion.title,
        maxPoints: criterion.maxPoints,
        awardedPoints: score.points,
        selectedLevel: matchedLevel
          ? {
              levelId: matchedLevel.id,
              name: matchedLevel.name,
              points: matchedLevel.points,
            }
          : null,
        feedback: score.feedback || null,
      });
    }

    const percentage = totalPossible > 0 ? (totalEarned / totalPossible) * 100 : 0;

    return {
      rubricId: rubric.id,
      rubricName: rubric.name,
      rubricType: rubric.type,
      totalEarnedPoints: parseFloat(totalEarned.toFixed(2)),
      totalPossiblePoints: parseFloat(totalPossible.toFixed(2)),
      percentageScore: parseFloat(percentage.toFixed(2)),
      criteriaEvaluations: evaluatedCriteria,
    };
  }
}
