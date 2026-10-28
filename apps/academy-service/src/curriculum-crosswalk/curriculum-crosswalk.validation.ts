import * as Joi from 'joi';

const addTextbookDtoSchema = Joi.object({
  courseId: Joi.number().integer().required(),
  title: Joi.string().required(),
  author: Joi.string().required(),
  edition: Joi.string().optional().allow('', null),
  isbn: Joi.string().optional().allow('', null),
  publisher: Joi.string().optional().allow('', null),
});

export const AddTextbookSchema = Joi.alternatives().try(
  Joi.object({
    dto: addTextbookDtoSchema.required(),
    user: Joi.any().optional(),
  }),
  addTextbookDtoSchema
);

export const CourseIdTextbookSchema = Joi.alternatives().try(
  Joi.object({
    courseId: Joi.number().integer().required(),
    user: Joi.any().optional(),
  }),
  Joi.object({
    courseId: Joi.number().integer().required(),
  })
);

const assignReadingDtoSchema = Joi.object({
  lessonId: Joi.number().integer().required(),
  textbookId: Joi.number().integer().required(),
  chapters: Joi.string().required(),
  pageRange: Joi.string().required(),
});

export const AssignReadingSchema = Joi.alternatives().try(
  Joi.object({
    dto: assignReadingDtoSchema.required(),
    user: Joi.any().optional(),
  }),
  assignReadingDtoSchema
);

export const LessonIdReadingSchema = Joi.alternatives().try(
  Joi.object({
    lessonId: Joi.number().integer().required(),
    user: Joi.any().optional(),
  }),
  Joi.object({
    lessonId: Joi.number().integer().required(),
  })
);
