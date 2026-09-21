import * as Joi from 'joi';
import { ProjectStatus } from '@prisma/client';

export const CreateProjectSchema = Joi.object({
  dto: Joi.object({
    name: Joi.string()
      .required()
      .description('The name of the construction project'),
    description: Joi.string()
      .optional()
      .allow('', null)
      .description('Brief description of the project goals'),
    clientId: Joi.string()
      .optional()
      .allow('', null)
      .description('The unique identifier of the client'),
    site: Joi.string()
      .optional()
      .allow('', null)
      .description('The construction site location name'),
    startDate: Joi.date().iso().optional().description('Scheduled start date'),
    endDate: Joi.date()
      .iso()
      .optional()
      .description('Estimated completion date'),
    budget: Joi.number()
      .optional()
      .description('Project budget in standard currency'),
    location: Joi.string()
      .optional()
      .allow('', null)
      .description('Physical address or coordinates'),
    contractorId: Joi.string()
      .optional()
      .allow('', null)
      .description('The ID of the assigned contractor'),
    inspectorId: Joi.string()
      .optional()
      .allow('', null)
      .description('The ID of the assigned inspector'),
  })
    .required()
    .description('Project creation details'),
  user: Joi.any().required().description('The authenticated admin character'),
}).description('Schema for creating a new construction project');

export const UpdateProjectSchema = Joi.object({
  id: Joi.number()
    .integer()
    .required()
    .description('The unique identifier of the project to update'),
  dto: Joi.object({
    name: Joi.string().optional().description('Updated project name'),
    description: Joi.string()
      .optional()
      .allow('', null)
      .description('Updated description'),
    clientId: Joi.string()
      .optional()
      .allow('', null)
      .description('Updated client ID'),
    startDate: Joi.date().iso().optional().description('Updated start date'),
    endDate: Joi.date().iso().optional().description('Updated end date'),
    budget: Joi.number().optional().description('Updated budget'),
    location: Joi.string()
      .optional()
      .allow('', null)
      .description('Updated location'),
    manager: Joi.string()
      .optional()
      .allow('', null)
      .description('Updated manager ID'),
    inspectorId: Joi.string()
      .optional()
      .allow('', null)
      .description('Updated inspector ID'),
    contractorId: Joi.string()
      .optional()
      .allow('', null)
      .description('Updated contractor ID'),
    status: Joi.string()
      .valid(...Object.values(ProjectStatus))
      .optional()
      .description('Updated project status'),
    photos: Joi.array()
      .items(Joi.string())
      .optional()
      .description('Updated list of project photo URLs'),
    progress: Joi.number()
      .min(0)
      .max(100)
      .optional()
      .description('Updated project progress percentage'),
  })
    .required()
    .description('Project update details'),
  user: Joi.any().required().description('The authenticated user'),
}).description('Schema for updating project details');

export const ProjectIdSchema = Joi.object({
  id: Joi.number()
    .integer()
    .required()
    .description('The unique identifier of the project'),
  user: Joi.any().required().description('The authenticated user context'),
}).description('Schema for operations requiring a single project ID');

export const FindAllProjectsSchema = Joi.object({
  query: Joi.any().optional().description('Filtering and pagination queries'),
  user: Joi.any().required().description('The authenticated user context'),
}).description('Schema for fetching multiple projects');

export const UpdateProjectStatusSchema = Joi.object({
  id: Joi.number().integer().required().description('The ID of the project'),
  status: Joi.string()
    .valid(...Object.values(ProjectStatus))
    .required()
    .description('The new status to apply'),
  user: Joi.any().required().description('The authenticated user'),
}).description('Schema for updating project status');

export const UpdateProjectProgressSchema = Joi.object({
  id: Joi.number().integer().required().description('The ID of the project'),
  progress: Joi.number()
    .min(0)
    .max(100)
    .required()
    .description('The completion percentage (0-100)'),
  notes: Joi.string()
    .optional()
    .allow('', null)
    .description('Optional notes about the progress update'),
  user: Joi.any()
    .required()
    .description('The authenticated contractor or admin'),
}).description('Schema for updating project completion progress');

export const CreateProjectUpdateSchema = Joi.object({
  projectId: Joi.number()
    .integer()
    .required()
    .description('The ID of the project'),
  text: Joi.string().required().description('The content of the weekly update'),
  isVisibleToClient: Joi.boolean()
    .optional()
    .description('Whether this update is visible to the client'),
  photos: Joi.array()
    .items(Joi.string())
    .optional()
    .description('List of photo URLs for the update'),
  tags: Joi.array()
    .items(Joi.string())
    .optional()
    .description('Categorization tags for the update'),
  user: Joi.any().required().description('The authenticated user'),
}).description('Schema for creating a weekly project update');

export const GetProjectUpdatesSchema = Joi.object({
  projectId: Joi.number()
    .integer()
    .required()
    .description('The ID of the project'),
  page: Joi.number().integer().optional().description('Pagination page number'),
  pageSize: Joi.number()
    .integer()
    .optional()
    .description('Number of updates per page'),
  user: Joi.any().required().description('The authenticated user context'),
}).description('Schema for fetching project updates');

export const AddProjectDocumentSchema = Joi.object({
  projectId: Joi.number()
    .integer()
    .required()
    .description('The ID of the project'),
  dto: Joi.object({
    title: Joi.string().required().description('Title of the document'),
    url: Joi.string()
      .uri()
      .required()
      .description('URL to the uploaded document'),
    fileType: Joi.string()
      .optional()
      .allow('', null)
      .description('MIME type or file extension'),
    isVisibleToClient: Joi.boolean()
      .optional()
      .description('Whether this document is visible to the client'),
  })
    .required()
    .description('Document details'),
  user: Joi.any().required().description('The authenticated user'),
}).description('Schema for adding a document to a project');

export const AddProjectCommentSchema = Joi.object({
  projectId: Joi.number()
    .integer()
    .required()
    .description('The ID of the project'),
  content: Joi.string().required().description('The comment text content'),
  user: Joi.any().required().description('The authenticated user'),
}).description('Schema for adding a comment to a project');
