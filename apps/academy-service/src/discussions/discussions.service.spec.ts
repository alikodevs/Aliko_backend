import { DiscussionsService } from './discussions.service';
import { AuthenticatedUser } from '../user/user.service';

describe('DiscussionsService with Rubrics Integration', () => {
  let service: DiscussionsService;
  let prisma: any;
  let userService: any;
  let rubricsService: any;

  const mockInstructor: AuthenticatedUser = {
    firebaseId: 'inst-1',
    email: 'instructor@test.com',
    firstname: 'Jane',
    lastname: 'Doe',
    role: 'INSTRUCTOR',
    status: 'ACTIVE',
  };

  const mockRubric = {
    id: 'rubric-101',
    name: 'Clinical Judgment & Infection Control Rubric',
    type: 'DISCUSSION',
    criteria: [
      {
        id: 'crit-1',
        title: 'Subject Mastery',
        maxPoints: 10,
        order: 1,
        levels: [
          { id: 'lvl-1', name: 'Exemplary', points: 10, order: 1 },
          { id: 'lvl-2', name: 'Competent', points: 7, order: 2 },
        ],
      },
      {
        id: 'crit-2',
        title: 'Peer Engagement',
        maxPoints: 5,
        order: 2,
        levels: [
          { id: 'lvl-3', name: 'Substantive', points: 5, order: 1 },
          { id: 'lvl-4', name: 'Minimal', points: 2, order: 2 },
        ],
      },
    ],
  };

  beforeEach(() => {
    prisma = {
      module: {
        findUnique: jest.fn().mockResolvedValue({
          id: 1,
          title: 'Infection Control',
          course: { instructorId: 'inst-1' },
        }),
      },
      discussionTopic: {
        create: jest.fn().mockImplementation((args) => ({
          id: 10,
          ...args.data,
          rubricRef: mockRubric,
        })),
        update: jest.fn().mockImplementation((args) => ({
          id: args.where.id,
          ...args.data,
          rubricRef: mockRubric,
        })),
        findUnique: jest.fn().mockResolvedValue({
          id: 10,
          moduleId: 1,
          title: 'Topic 1',
          prompt: 'Discuss PPE',
          maxPoints: 15,
          rubricId: 'rubric-101',
          module: { course: { instructorId: 'inst-1' } },
        }),
        findMany: jest.fn().mockResolvedValue([
          {
            id: 10,
            moduleId: 1,
            title: 'Topic 1',
            rubricRef: mockRubric,
            _count: { posts: 2 },
          },
        ]),
      },
      discussionPost: {
        findUnique: jest.fn().mockResolvedValue({
          id: 50,
          topicId: 10,
          userId: 'stud-1',
          body: 'My discussion post content',
          topic: {
            id: 10,
            rubricId: 'rubric-101',
            maxPoints: 15,
            module: { course: { instructorId: 'inst-1' } },
            rubricRef: mockRubric,
          },
        }),
        create: jest.fn().mockImplementation((args) => ({
          id: 51,
          ...args.data,
          profile: { userId: 'stud-1', role: 'STUDENT' },
        })),
      },
      discussionGrade: {
        upsert: jest.fn().mockImplementation((args) => ({
          id: 100,
          postId: args.where.postId,
          score: args.update.score,
          rubricScores: args.update.rubricScores,
          feedback: args.update.feedback,
          graderId: args.update.graderId,
        })),
      },
    };

    userService = {
      getOrCreateProfile: jest.fn().mockResolvedValue({
        userId: 'inst-1',
        role: 'INSTRUCTOR',
      }),
    };

    rubricsService = {
      findOne: jest.fn().mockResolvedValue(mockRubric),
      create: jest.fn().mockResolvedValue(mockRubric),
      evaluateWithRubric: jest.fn().mockResolvedValue({
        rubricId: 'rubric-101',
        totalEarnedPoints: 15,
        totalPossiblePoints: 15,
        percentageScore: 100,
        criteriaEvaluations: [
          { criterionId: 'crit-1', levelId: 'lvl-1', points: 10 },
          { criterionId: 'crit-2', levelId: 'lvl-3', points: 5 },
        ],
      }),
    };

    service = new DiscussionsService(
      prisma,
      userService,
      rubricsService,
    );
  });

  it('should create a discussion topic and attach a rubric with calculated maxPoints', async () => {
    const topic = await service.createTopic(
      {
        moduleId: 1,
        title: 'PPE Protocol Discussion',
        prompt: 'Explain the sequence of donning and doffing PPE.',
        rubricId: 'rubric-101',
      },
      mockInstructor,
    );

    expect(rubricsService.findOne).toHaveBeenCalledWith('rubric-101');
    expect(prisma.discussionTopic.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          moduleId: 1,
          rubricId: 'rubric-101',
          maxPoints: 15, // 10 + 5 from mockRubric criteria
        }),
      }),
    );
    expect(topic.rubricRef).toBeDefined();
    expect(topic.rubricRef?.criteria).toHaveLength(2);
  });

  it('should update discussion topic to attach or modify rubric', async () => {
    const updated = await service.updateTopic(
      10,
      {
        rubricId: 'rubric-101',
        prompt: 'Updated prompt',
      },
      mockInstructor,
    );

    expect(rubricsService.findOne).toHaveBeenCalledWith('rubric-101');
    expect(prisma.discussionTopic.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 10 },
        data: expect.objectContaining({
          rubricId: 'rubric-101',
          maxPoints: 15,
        }),
      }),
    );
    expect(updated.id).toBe(10);
  });

  it('should include rubric in findAllByModule', async () => {
    const topics = await service.findAllByModule(1, mockInstructor);
    expect(topics[0].rubricRef).toBeDefined();
    expect(prisma.discussionTopic.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          rubricRef: expect.any(Object),
        }),
      }),
    );
  });

  it('should grade a discussion post using attached rubric criteria levels', async () => {
    const grade = await service.gradePost(
      50,
      {
        selectedLevelIds: ['lvl-1', 'lvl-3'],
        feedback: 'Excellent breakdown of PPE protocols and peer replies.',
      },
      mockInstructor,
    );

    expect(rubricsService.evaluateWithRubric).toHaveBeenCalledWith(
      expect.objectContaining({
        rubricId: 'rubric-101',
        selectedLevelIds: ['lvl-1', 'lvl-3'],
        customFeedback: 'Excellent breakdown of PPE protocols and peer replies.',
      }),
    );

    expect(prisma.discussionGrade.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { postId: 50 },
        update: expect.objectContaining({
          score: 15,
          feedback: 'Excellent breakdown of PPE protocols and peer replies.',
          graderId: 'inst-1',
          rubricScores: expect.any(Array),
        }),
      }),
    );

    expect(grade.score).toBe(15);
    expect(grade.rubricScores).toHaveLength(2);
  });
});
