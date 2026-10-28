import * as Joi from 'joi';

const createCourseModuleDtoSchema = Joi.object({
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
});

export const CreateCourseModuleSchema = Joi.alternatives().try(
  Joi.object({
    dto: createCourseModuleDtoSchema.required(),
    user: Joi.any().optional(),
  }),
  createCourseModuleDtoSchema
);

const updateCourseModuleDtoSchema = Joi.object({
  title: Joi.string().optional().description('The updated title'),
  description: Joi.string().optional().description('The updated description'),
  courseId: Joi.number()
    .integer()
    .optional()
    .description('The updated course ID'),
});

export const UpdateCourseModuleSchema = Joi.alternatives().try(
  Joi.object({
    id: Joi.number().integer().optional(),
    dto: updateCourseModuleDtoSchema.required(),
    user: Joi.any().optional(),
  }),
  updateCourseModuleDtoSchema
);

export const ModuleIdSchema = Joi.alternatives().try(
  Joi.object({
    id: Joi.number()
      .integer()
      .required()
      .description('The unique identifier of the module'),
    user: Joi.any().optional().description('The authenticated user'),
  }),
  Joi.object({
    id: Joi.number().integer().required(),
  })
);

export const CourseIdModuleSchema = Joi.alternatives().try(
  Joi.object({
    courseId: Joi.number()
      .integer()
      .required()
      .description('The unique identifier of the course'),
    user: Joi.any().optional().description('The authenticated user'),
    query: Joi.object()
      .optional()
      .default({})
      .description('Pagination and filter queries'),
  }),
  Joi.object({
    courseId: Joi.number().integer().required(),
    query: Joi.object().optional().default({}),
  })
);

export const FindAllModulesSchema = Joi.alternatives().try(
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
