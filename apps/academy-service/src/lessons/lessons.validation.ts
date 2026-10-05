import * as Joi from 'joi';

export const CreateLessonSchema = Joi.object({
  dto: Joi.object({
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
  })
    .required()
    .description('Lesson creation details'),
  user: Joi.any()
    .required()
    .description('The authenticated user (Instructor or Admin)'),
}).description('Schema for creating a new lesson');

export const UpdateLessonSchema = Joi.object({
  id: Joi.number()
    .integer()
    .required()
    .description('The unique identifier of the lesson to update'),
  dto: Joi.object({
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
  })
    .required()
    .description('Lesson update details'),
  user: Joi.any().required().description('The authenticated user'),
}).description('Schema for updating an existing lesson');

export const LessonIdSchema = Joi.object({
  id: Joi.number()
    .integer()
    .required()
    .description('The unique identifier of the lesson'),
  user: Joi.any().required().description('The authenticated user'),
}).description('Schema for operations requiring a single lesson ID');

export const ModuleIdLessonSchema = Joi.object({
  moduleId: Joi.number()
    .integer()
    .required()
    .description('The unique identifier of the module'),
  user: Joi.any().required().description('The authenticated user'),
  query: Joi.object()
    .optional()
    .default({})
    .description('Pagination and filter queries'),
}).description('Schema for fetching lessons by module');

export const FindLessonsSchema = Joi.object({
  user: Joi.any().required().description('The authenticated user'),
  query: Joi.object()
    .optional()
    .default({})
    .description('Pagination and filter queries'),
}).description('Schema for fetching instructor lessons');
