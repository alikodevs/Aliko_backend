import * as Joi from 'joi';

export const CreateExerciseSchema = Joi.object({
  dto: Joi.object({
    title: Joi.string().required().description('The title of the exercise'),
    description: Joi.string()
      .allow('', null)
      .optional()
      .description('Detailed instructions for the exercise'),
    moduleId: Joi.number()
      .integer()
      .required()
      .description('The module ID this exercise belongs to'),
    lessonId: Joi.number()
      .integer()
      .optional()
      .description('The lesson ID this exercise belongs to'),
    type: Joi.string()
      .valid('MULTIPLE_CHOICE', 'TRUE_FALSE', 'MATCHING', 'SHORT_TEXT')
      .required()
      .description('The type of exercise'),
    question: Joi.string().required().description('The question text'),
    options: Joi.any()
      .optional()
      .description('Options for multiple choice etc.'),
    correctAnswer: Joi.any().optional().description('The correct answer'),
    hints: Joi.array()
      .items(Joi.string())
      .optional()
      .description('Hints for the student'),
    points: Joi.number()
      .integer()
      .optional()
      .default(1)
      .description('Points for this exercise'),
    order: Joi.number()
      .integer()
      .optional()
      .default(0)
      .description('Order of the exercise'),
  })
    .required()
    .description('Exercise creation details'),
  user: Joi.any().required().description('The authenticated user'),
}).description('Schema for creating a new exercise');

export const CreateBulkExercisesSchema = Joi.object({
  dtos: Joi.array().items(
    Joi.object({
      title: Joi.string().required(),
      description: Joi.string().allow('', null).optional(),
      moduleId: Joi.number().integer().required(),
      lessonId: Joi.number().integer().optional(),
      type: Joi.string().valid('MULTIPLE_CHOICE', 'TRUE_FALSE', 'MATCHING', 'SHORT_TEXT').required(),
      question: Joi.string().required(),
      options: Joi.any().optional(),
      correctAnswer: Joi.any().optional(),
      hints: Joi.array().items(Joi.string()).optional(),
      points: Joi.number().integer().optional().default(1),
      order: Joi.number().integer().optional().default(0),
    })
  ).required(),
  user: Joi.any().required()
}).description('Schema for bulk creating exercises');

export const UpdateExerciseSchema = Joi.object({
  id: Joi.number()
    .integer()
    .required()
    .description('The unique identifier of the exercise to update'),
  dto: Joi.object({
    title: Joi.string().optional().description('The updated title'),
    description: Joi.string()
      .allow('', null)
      .optional()
      .description('The updated instructions'),
    moduleId: Joi.number()
      .integer()
      .optional()
      .description('The updated module ID'),
    lessonId: Joi.number()
      .integer()
      .optional()
      .description('The updated lesson ID'),
    type: Joi.string()
      .valid('MULTIPLE_CHOICE', 'TRUE_FALSE', 'MATCHING', 'SHORT_TEXT')
      .optional()
      .description('The updated type'),
    question: Joi.string().optional().description('The updated question'),
    options: Joi.any().optional().description('The updated options'),
    correctAnswer: Joi.any()
      .optional()
      .description('The updated correct answer'),
    hints: Joi.array()
      .items(Joi.string())
      .optional()
      .description('The updated hints'),
    points: Joi.number().integer().optional().description('The updated points'),
    order: Joi.number().integer().optional().description('The updated order'),
  })
    .required()
    .description('Exercise update details'),
  user: Joi.any().required().description('The authenticated user'),
}).description('Schema for updating an existing exercise');

export const ExerciseIdSchema = Joi.object({
  id: Joi.number()
    .integer()
    .required()
    .description('The unique identifier of the exercise'),
  user: Joi.any().required().description('The authenticated user'),
}).description('Schema for operations requiring a single exercise ID');

export const ModuleIdExerciseSchema = Joi.object({
  moduleId: Joi.number()
    .integer()
    .required()
    .description('The unique identifier of the module'),
  user: Joi.any().required().description('The authenticated user'),
  query: Joi.object()
    .optional()
    .default({})
    .description('Pagination and filter queries'),
}).description('Schema for fetching exercises by module');

export const FindExercisesSchema = Joi.object({
  user: Joi.any().required().description('The authenticated user'),
  query: Joi.object()
    .optional()
    .default({})
    .description('Pagination and filter queries'),
}).description('Schema for querying lists of exercises');

export const SubmitExerciseSchema = Joi.object({
  id: Joi.number()
    .integer()
    .required()
    .description('The unique identifier of the exercise being submitted'),
  dto: Joi.object({
    answer: Joi.any()
      .required()
      .description('The student response (structured based on exercise type)'),
    submissionTime: Joi.date()
      .optional()
      .description('Optional timestamp of the submission'),
  })
    .required()
    .description('Submission payload'),
  user: Joi.any()
    .required()
    .description('The student performing the submission'),
}).description('Schema for submitting an exercise');

export const GradeExerciseSchema = Joi.object({
  id: Joi.number()
    .integer()
    .required()
    .description('The unique identifier of the submission being graded'),
  dto: Joi.object({
    isCorrect: Joi.boolean()
      .required()
      .description('Whether the submission is correct'),
    score: Joi.number().required().description('The numerical grade assigned'),
    feedback: Joi.string()
      .optional()
      .allow('', null)
      .description('Qualitative feedback from the instructor'),
  })
    .required()
    .description('Grading details'),
  user: Joi.any()
    .required()
    .description('The instructor performing the grading'),
}).description('Schema for grading a student submission');
