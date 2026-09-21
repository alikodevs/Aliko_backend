import * as Joi from 'joi';
import { TaskPriority, TaskStatus } from '@prisma/client';

export const CreateTaskSchema = Joi.object({
  dto: Joi.object({
    projectId: Joi.number()
      .integer()
      .required()
      .description('The ID of the project this task belongs to'),
    description: Joi.string()
      .optional()
      .allow('', null)
      .description('Detailed description of the task'),
    priority: Joi.string()
      .valid(...Object.values(TaskPriority))
      .optional()
      .description('Task priority level'),
    assignedTo: Joi.string()
      .optional()
      .allow('', null)
      .description('ID of the user assigned to this task'),
    deadline: Joi.date()
      .iso()
      .optional()
      .description('Task completion deadline'),
    estimatedHours: Joi.number()
      .optional()
      .description('Estimated hours to complete the task'),
    dependencies: Joi.array()
      .items(Joi.number().integer())
      .optional()
      .description('List of task IDs that this task depends on'),
    isVisibleToClient: Joi.boolean()
      .optional()
      .description('Whether the task is visible to the client'),
  })
    .required()
    .description('Task creation details'),
  user: Joi.any().required().description('The authenticated user context'),
}).description('Schema for creating a new construction task');

export const UpdateTaskSchema = Joi.object({
  id: Joi.number()
    .integer()
    .required()
    .description('The ID of the task to update'),
  dto: Joi.object({
    projectId: Joi.number()
      .integer()
      .optional()
      .description('Updated project ID'),
    description: Joi.string()
      .optional()
      .description('Updated task description'),
    priority: Joi.string()
      .valid(...Object.values(TaskPriority))
      .optional()
      .description('Updated priority level'),
    status: Joi.string()
      .valid(...Object.values(TaskStatus))
      .optional()
      .description('Updated completion status'),
    actualHours: Joi.number()
      .optional()
      .description('Actual hours spent on the task'),
    progress: Joi.number()
      .min(0)
      .max(100)
      .optional()
      .description('Task completion percentage'),
    assignedTo: Joi.string()
      .optional()
      .allow('', null)
      .description('Updated assigned user ID'),
    deadline: Joi.date().iso().optional().description('Updated deadline'),
    dependencies: Joi.array()
      .items(Joi.number().integer())
      .optional()
      .description('Updated list of dependencies'),
    isVisibleToClient: Joi.boolean()
      .optional()
      .description('Updated visibility status'),
  })
    .required()
    .description('Task update details'),
  user: Joi.any().required().description('The authenticated user context'),
}).description('Schema for updating task details');

export const TaskIdSchema = Joi.object({
  id: Joi.number()
    .integer()
    .required()
    .description('The unique identifier of the task'),
  user: Joi.any().required().description('The authenticated user context'),
}).description('Schema for operations requiring a single task ID');

export const GetTasksByProjectSchema = Joi.object({
  projectId: Joi.number()
    .integer()
    .required()
    .description('The project ID to fetch tasks for'),
  user: Joi.any().required().description('The authenticated user context'),
}).description('Schema for fetching tasks related to a project');

export const FindAllTasksSchema = Joi.object({
  query: Joi.any().optional().description('Filtering and pagination queries'),
  user: Joi.any().required().description('The authenticated user context'),
}).description('Schema for fetching multiple tasks');
