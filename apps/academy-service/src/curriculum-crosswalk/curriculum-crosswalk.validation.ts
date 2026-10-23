import * as Joi from 'joi';

export const AddTextbookSchema = Joi.object({
  dto: Joi.object({
    courseId: Joi.number().integer().required(),
    title: Joi.string().required(),
    author: Joi.string().required(),
    edition: Joi.string().optional().allow(''),
    isbn: Joi.string().optional().allow(''),
    publisher: Joi.string().optional().allow(''),
  }).required(),
  user: Joi.any().required(),
});

export const CourseIdTextbookSchema = Joi.object({
  courseId: Joi.number().integer().required(),
  user: Joi.any().required(),
});

export const AssignReadingSchema = Joi.object({
  dto: Joi.object({
    lessonId: Joi.number().integer().required(),
    textbookId: Joi.number().integer().required(),
    chapters: Joi.string().required(),
    pageRange: Joi.string().required(),
  }).required(),
  user: Joi.any().required(),
});

export const LessonIdReadingSchema = Joi.object({
  lessonId: Joi.number().integer().required(),
  user: Joi.any().required(),
});
