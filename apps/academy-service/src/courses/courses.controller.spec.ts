import { Test, TestingModule } from '@nestjs/testing';
import { CoursesController } from './courses.controller';
import { CoursesService } from './courses.service';
import { UserService } from '../user/user.service';
import { Reflector } from '@nestjs/core';

describe('CoursesController', () => {
  let controller: CoursesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CoursesController],
      providers: [
        {
          provide: CoursesService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
            updateStatus: jest.fn(),
            assignInstructor: jest.fn(),
            submitForApproval: jest.fn(),
            approve: jest.fn(),
            reject: jest.fn(),
            getInstructorCoursesWithStats: jest.fn(),
          },
        },
        {
          provide: UserService,
          useValue: {
            getOrCreateProfile: jest.fn(),
          },
        },
        Reflector,
      ],
    }).compile();

    controller = module.get<CoursesController>(CoursesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
