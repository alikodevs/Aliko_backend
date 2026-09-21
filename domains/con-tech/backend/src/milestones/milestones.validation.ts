import * as Joi from 'joi';
import { MilestoneStatus } from '@prisma/client';

export const CreateMilestoneSchema = Joi.object({
  createMilestoneDto: Joi.object({
    projectId: Joi.number()
      .integer()
      .required()
      .description('The ID of the project this milestone belongs to'),
    title: Joi.string()
      .required()
      .description('Title of the project milestone'),
    description: Joi.string()
      .optional()
      .allow('', null)
      .description('Brief description of the milestone criteria'),
    status: Joi.string()
      .valid(...Object.values(MilestoneStatus))
      .optional()
      .description('Initial status of the milestone'),
    dueDate: Joi.date()
      .iso()
      .optional()
      .description('Expected completion date for this milestone'),
    isVisibleToClient: Joi.boolean()
      .optional()
      .description('Whether this milestone is visible to the client'),
  })
    .required()
    .description('Milestone creation details'),
  user: Joi.any().required().description('The authenticated user context'),
}).description('Schema for creating a new project milestone');

export const UpdateMilestoneSchema = Joi.object({
  id: Joi.number()
    .integer()
    .required()
    .description('The ID of the milestone to update'),
  updateMilestoneDto: Joi.object({
    title: Joi.string().optional().description('Updated milestone title'),
    description: Joi.string()
      .optional()
      .allow('', null)
      .description('Updated description'),
    status: Joi.string()
      .valid(...Object.values(MilestoneStatus))
      .optional()
      .description('Updated status'),
    isVisibleToClient: Joi.boolean()
      .optional()
      .description('Updated visibility status'),
  })
    .required()
    .description('Milestone update details'),
  user: Joi.any().required().description('The authenticated user context'),
}).description('Schema for updating milestone details');

export const CreateMilestoneReviewSchema = Joi.object({
  id: Joi.number()
    .integer()
    .required()
    .description('The ID of the milestone to review'),
  createMilestoneReviewDto: Joi.object({
    inspectorId: Joi.string()
      .required()
      .description('The ID of the inspector conducting the review'),
    status: Joi.string()
      .valid(...Object.values(MilestoneStatus))
      .required()
      .description('Review outcome status'),
    comments: Joi.string().required().description('Inspector comments'),
  })
    .required()
    .description('Review details'),
  user: Joi.any().required().description('The authenticated user context'),
}).description('Schema for submitting a milestone review');

export const MilestoneIdSchema = Joi.object({
  id: Joi.number()
    .integer()
    .required()
    .description('The unique identifier of the milestone'),
  user: Joi.any().required().description('The authenticated user context'),
}).description('Schema for operations requiring a single milestone ID');

export const FindMilestonesSchema = Joi.object({
  findAllMilestonesDto: Joi.object({
    projectId: Joi.number()
      .integer()
      .required()
      .description('The project ID to fetch milestones for'),
  })
    .required()
    .description('Find all milestones query details'),
  user: Joi.any().required().description('The authenticated user context'),
}).description('Schema for fetching milestones related to a project');
