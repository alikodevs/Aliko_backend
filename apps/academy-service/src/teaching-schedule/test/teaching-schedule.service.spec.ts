import { Test, TestingModule } from '@nestjs/testing';
import { TeachingScheduleService } from '../teaching-schedule.service';
import { PrismaService } from '../../prisma/prisma.service';
import { UserService } from '../../user/user.service';

describe('TeachingScheduleService', () => {
  let service: TeachingScheduleService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeachingScheduleService,
        {
          provide: PrismaService,
          useValue: {
            teachingSchedule: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
            course: {
              findUnique: jest.fn(),
            },
            enrollment: {
              findFirst: jest.fn(),
            },
          },
        },
        {
          provide: UserService,
          useValue: {
            getOrCreateProfile: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<TeachingScheduleService>(TeachingScheduleService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
