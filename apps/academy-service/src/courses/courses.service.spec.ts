import { Test, TestingModule } from '@nestjs/testing';
import { CoursesService } from './courses.service';
import { PrismaService } from '../prisma/prisma.service';
import { UserService } from '../user/user.service';

describe('CoursesService', () => {
  let service: CoursesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CoursesService,
        {
          provide: PrismaService,
          useValue: {
            course: {
              findFirst: jest.fn(),
              findUnique: jest.fn(),
              findMany: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
              count: jest.fn(),
              groupBy: jest.fn(),
            },
            cohort: {
              create: jest.fn(),
            },
            enrollment: {
              count: jest.fn(),
            },
            module: {
              create: jest.fn(),
            },
            lesson: {
              create: jest.fn(),
            },
            $transaction: jest.fn((cb) =>
              cb({
                course: { create: jest.fn() },
                cohort: { create: jest.fn() },
                module: { create: jest.fn() },
                lesson: { create: jest.fn() },
              }),
            ),
          },
        },
        {
          provide: UserService,
          useValue: {
            getOrCreateProfile: jest.fn(),
            getUsersByIds: jest.fn(),
            getUserById: jest.fn(),
            ensureProfileExists: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<CoursesService>(CoursesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
