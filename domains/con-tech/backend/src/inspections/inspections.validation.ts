import * as Joi from 'joi';
import { InspectionStatus, ChecklistItemStatus } from '@prisma/client';

export const CreateInspectionSchema = Joi.object({
  dto: Joi.object({
    projectId: Joi.number()
      .integer()
      .required()
      .description('The ID of the project being inspected'),
    title: Joi.string()
      .optional()
      .allow('', null)
      .description('Title of the inspection'),
    inspectorId: Joi.string()
      .optional()
      .allow('', null)
      .description('The ID of the assigned inspector'),
    status: Joi.string()
      .valid(...Object.values(InspectionStatus))
      .optional()
      .description('Initial status of the inspection'),
    checklist: Joi.array()
      .items(
        Joi.object({
          itemDescription: Joi.string()
            .max(255)
            .required()
            .description('Description of the checklist item'),
          status: Joi.string()
            .valid(...Object.values(ChecklistItemStatus))
            .required()
            .description('Status of the specific item'),
          comment: Joi.string()
            .max(500)
            .optional()
            .allow('', null)
            .description('Optional inspector comment for this item'),
        }),
      )
      .optional()
      .description('List of checklist items and their initial states'),
    isVisibleToClient: Joi.boolean()
      .optional()
      .description('Whether the inspection report is visible to the client'),
  })
    .required()
    .description('Inspection creation details'),
  user: Joi.any().required().description('The authenticated user context'),
}).description('Schema for creating a new project inspection');

export const UpdateInspectionSchema = Joi.object({
  id: Joi.number()
    .integer()
    .required()
    .description('The ID of the inspection report to update'),
  dto: Joi.object({
    id: Joi.number()
      .integer()
      .optional()
      .description('The ID of the inspection report'),
    inspector: Joi.string().optional().description('Updated inspector ID'),
    status: Joi.string()
      .valid(...Object.values(InspectionStatus))
      .optional()
      .description('Updated status of the inspection'),
    isVisibleToClient: Joi.boolean()
      .optional()
      .description('Updated visibility status for the client'),
  })
    .required()
    .description('Inspection update details'),
  user: Joi.any().required().description('The authenticated user context'),
}).description('Schema for updating an inspection report');

export const InspectionIdSchema = Joi.object({
  id: Joi.number()
    .integer()
    .required()
    .description('The unique identifier of the inspection'),
  user: Joi.any().required().description('The authenticated user context'),
}).description('Schema for operations requiring a single inspection ID');

export const GetInspectionsByProjectSchema = Joi.object({
  projectId: Joi.number()
    .integer()
    .required()
    .description('The project ID to fetch inspections for'),
  user: Joi.any().required().description('The authenticated user context'),
}).description('Schema for fetching inspections related to a project');
