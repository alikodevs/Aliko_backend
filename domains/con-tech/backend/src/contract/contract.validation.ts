import * as Joi from 'joi';
import { ContractStatus } from '@prisma/client';

export const CreateContractSchema = Joi.object({
  projectId: Joi.number()
    .integer()
    .required()
    .description('The ID of the project associated with the contract'),
  contractFile: Joi.string()
    .required()
    .description('URL or path to the contract document file'),
  status: Joi.string()
    .valid(...Object.values(ContractStatus))
    .required()
    .description('Initial status of the contract'),
  changeOrders: Joi.object()
    .required()
    .description('Initial change orders data (can be empty object)'),
}).description('Schema for creating a new project contract');

export const UpdateContractStatusSchema = Joi.object({
  id: Joi.number()
    .integer()
    .required()
    .description('The unique identifier of the contract'),
  status: Joi.string()
    .valid(...Object.values(ContractStatus))
    .required()
    .description('The new status to apply to the contract'),
  user: Joi.any().required().description('The authenticated user context'),
}).description('Schema for updating contract status');

export const AddChangeOrderSchema = Joi.object({
  contractId: Joi.number()
    .integer()
    .required()
    .description('The ID of the contract to add a change order to'),
  dto: Joi.object({
    description: Joi.string()
      .max(500)
      .required()
      .description('Brief description of the change order'),
    costImpact: Joi.number()
      .required()
      .description('The financial impact of the change (positive or negative)'),
    scheduleImpact: Joi.string()
      .required()
      .description('The time impact (e.g., "+10 days")'),
  })
    .required()
    .description('Change order details'),
  user: Joi.any().required().description('The authenticated user context'),
}).description('Schema for adding a change order to a contract');

export const ContractIdSchema = Joi.object({
  id: Joi.number()
    .integer()
    .required()
    .description('The unique identifier of the contract'),
  user: Joi.any().required().description('The authenticated user context'),
}).description('Schema for operations requiring a single contract ID');
