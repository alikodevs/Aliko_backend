import * as Joi from 'joi';

export const CreateCourseModuleSchema = Joi.object({
  dto: Joi.object({
    title: Joi.string()
      .required()
      .description('The title of the course module'),
    description: Joi.string()
      .required()
      .description('A detailed description of the module content'),
    courseId: Joi.number()
      .integer()
      .required()
      .description(
        'The unique identifier of the course this module belongs to',
      ),
  })
    .required()
    .description('Course module creation details'),
  user: Joi.any()
    .required()
    .description('The authenticated user (Instructor or Admin)'),
}).description('Schema for creating a new course module');

export const UpdateCourseModuleSchema = Joi.object({
  id: Joi.number()
    .integer()
    .required()
    .description('The unique identifier of the module to update'),
  dto: Joi.object({
    title: Joi.string().optional().description('The updated title'),
    description: Joi.string().optional().description('The updated description'),
    courseId: Joi.number()
      .integer()
      .optional()
      .description('The updated course ID'),
  })
    .required()
    .description('Course module update details'),
  user: Joi.any().required().description('The authenticated user'),
}).description('Schema for updating an existing course module');

export const ModuleIdSchema = Joi.object({
  id: Joi.number()
    .integer()
    .required()
    .description('The unique identifier of the module'),
  user: Joi.any().required().description('The authenticated user'),
}).description('Schema for operations requiring a single module ID');

export const CourseIdModuleSchema = Joi.object({
  courseId: Joi.number()
    .integer()
    .required()
    .description('The unique identifier of the course'),
  user: Joi.any().required().description('The authenticated user'),
  query: Joi.object()
    .optional()
    .default({})
    .description('Pagination and filter queries'),
}).description('Schema for fetching modules by course');

export const FindAllModulesSchema = Joi.object({
  user: Joi.any().required().description('The authenticated user'),
  query: Joi.object()
    .optional()
    .default({})
    .description('Pagination and filter queries'),
}).description('Schema for fetching all course modules');
