import * as Joi from 'joi';

const createLessonDtoSchema = Joi.object({
  title: Joi.string().required().description('The title of the lesson'),
  type: Joi.string()
    .valid('VIDEO', 'WEBINAR', 'ASSIGNMENT', 'QUIZ')
    .required()
    .description('The pedagogical type of the lesson'),
  moduleId: Joi.number()
    .integer()
    .required()
    .description(
      'The unique identifier of the module this lesson belongs to',
    ),
  dueDate: Joi.date()
    .optional()
    .allow(null)
    .description('Optional deadline for completing the lesson'),
  maxScore: Joi.number()
    .integer()
    .optional()
    .allow(null)
    .description('Maximum possible score for assignments or quizzes'),
  order: Joi.number()
    .integer()
    .optional()
    .default(0)
    .description('The display order within the module'),
  unlockRules: Joi.any()
    .optional()
    .description('Conditional logic for unlocking this lesson'),
});

export const CreateLessonSchema = Joi.alternatives().try(
  Joi.object({
    dto: createLessonDtoSchema.required(),
    user: Joi.any().optional(),
  }),
  createLessonDtoSchema
);

const updateLessonDtoSchema = Joi.object({
  title: Joi.string().optional().description('The updated title'),
  type: Joi.string()
    .valid('VIDEO', 'WEBINAR', 'ASSIGNMENT', 'QUIZ')
    .optional()
    .description('The updated type'),
  moduleId: Joi.number()
    .integer()
    .optional()
    .description('The updated module ID'),
  dueDate: Joi.date()
    .optional()
    .allow(null)
    .description('The updated due date'),
  maxScore: Joi.number()
    .integer()
    .optional()
    .allow(null)
    .description('The updated max score'),
  order: Joi.number().integer().optional().description('The updated order'),
  unlockRules: Joi.any().optional().description('The updated unlock rules'),
});

export const UpdateLessonSchema = Joi.alternatives().try(
  Joi.object({
    id: Joi.number().integer().optional(),
    dto: updateLessonDtoSchema.required(),
    user: Joi.any().optional(),
  }),
  updateLessonDtoSchema
);

export const LessonIdSchema = Joi.alternatives().try(
  Joi.object({
    id: Joi.number()
      .integer()
      .required()
      .description('The unique identifier of the lesson'),
    user: Joi.any().optional().description('The authenticated user'),
  }),
  Joi.object({
    id: Joi.number().integer().required(),
  })
);

export const ModuleIdLessonSchema = Joi.alternatives().try(
  Joi.object({
    moduleId: Joi.number()
      .integer()
      .required()
      .description('The unique identifier of the module'),
    user: Joi.any().optional().description('The authenticated user'),
    query: Joi.object()
      .optional()
      .default({})
      .description('Pagination and filter queries'),
  }),
  Joi.object({
    moduleId: Joi.number().integer().required(),
    query: Joi.object().optional().default({}),
  })
);

export const FindLessonsSchema = Joi.alternatives().try(
  Joi.object({
    user: Joi.any().optional().description('The authenticated user'),
    query: Joi.object()
      .optional()
      .default({})
      .description('Pagination and filter queries'),
  }),
  Joi.object({
    query: Joi.object().optional().default({}),
  })
);
