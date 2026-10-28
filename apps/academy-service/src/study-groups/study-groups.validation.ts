import * as Joi from 'joi';

const createStudyGroupDtoSchema = Joi.object({
  cohortId: Joi.number().integer().required(),
  name: Joi.string().required().min(2).max(100),
  description: Joi.string().optional().allow('', null).max(500),
  meetingUrl: Joi.string().uri().optional().allow('', null),
});

export const CreateStudyGroupSchema = Joi.alternatives().try(
  Joi.object({
    dto: createStudyGroupDtoSchema.required(),
    user: Joi.any().optional(),
  }),
  createStudyGroupDtoSchema
);

const joinStudyGroupDtoSchema = Joi.object({
  studyGroupId: Joi.number().integer().required(),
});

export const JoinStudyGroupSchema = Joi.alternatives().try(
  Joi.object({
    dto: joinStudyGroupDtoSchema.required(),
    user: Joi.any().optional(),
  }),
  joinStudyGroupDtoSchema
);

const updateStudyGroupDtoSchema = Joi.object({
  name: Joi.string().optional().min(2).max(100),
  description: Joi.string().optional().allow('', null).max(500),
  meetingUrl: Joi.string().uri().allow('', null).optional(),
});

export const UpdateStudyGroupSchema = Joi.alternatives().try(
  Joi.object({
    studyGroupId: Joi.number().integer().optional(),
    dto: updateStudyGroupDtoSchema.required(),
    user: Joi.any().optional(),
  }),
  updateStudyGroupDtoSchema
);

export const StudyGroupIdSchema = Joi.alternatives().try(
  Joi.object({
    studyGroupId: Joi.number().integer().required(),
    user: Joi.any().optional(),
  }),
  Joi.object({
    studyGroupId: Joi.number().integer().required(),
  })
);

export const CohortStudyGroupsSchema = Joi.alternatives().try(
  Joi.object({
    cohortId: Joi.number().integer().required(),
    user: Joi.any().optional(),
  }),
  Joi.object({
    cohortId: Joi.number().integer().required(),
  })
);
