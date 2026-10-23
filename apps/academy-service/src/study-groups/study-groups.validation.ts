import * as Joi from 'joi';

export const CreateStudyGroupSchema = Joi.object({
  dto: Joi.object({
    cohortId: Joi.number().integer().required(),
    name: Joi.string().required().min(2).max(100),
    description: Joi.string().optional().max(500),
    meetingUrl: Joi.string().uri().optional(),
  }).required(),
  user: Joi.any().required(),
});

export const JoinStudyGroupSchema = Joi.object({
  dto: Joi.object({
    studyGroupId: Joi.number().integer().required(),
  }).required(),
  user: Joi.any().required(),
});

export const UpdateStudyGroupSchema = Joi.object({
  studyGroupId: Joi.number().integer().required(),
  dto: Joi.object({
    name: Joi.string().optional().min(2).max(100),
    description: Joi.string().optional().max(500),
    meetingUrl: Joi.string().uri().allow('', null).optional(),
  }).required(),
  user: Joi.any().required(),
});

export const StudyGroupIdSchema = Joi.object({
  studyGroupId: Joi.number().integer().required(),
  user: Joi.any().required(),
});

export const CohortStudyGroupsSchema = Joi.object({
  cohortId: Joi.number().integer().required(),
  user: Joi.any().required(),
});
