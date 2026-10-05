import * as Joi from 'joi';

export const CreateClientReportSchema = Joi.object({
  dto: Joi.object({
    title: Joi.string().required().description('Title of the client report'),
    projectId: Joi.number()
      .integer()
      .positive()
      .required()
      .description('The ID of the project this report is for'),
    summary: Joi.string()
      .min(20)
      .max(5000)
      .required()
      .description('Executive summary of the project status'),
    KPIs: Joi.array()
      .items(
        Joi.object({
          name: Joi.string()
            .max(100)
            .required()
            .description('Name of the KPI (e.g., Budget Variance)'),
          value: Joi.string()
            .max(50)
            .required()
            .description('Current value of the KPI'),
          target: Joi.string()
            .max(50)
            .required()
            .description('Target value for the KPI'),
        }),
      )
      .required()
      .description('List of key performance indicators'),
  })
    .required()
    .description('Client report creation details'),
  user: Joi.any().required().description('The authenticated user context'),
}).description('Schema for creating a new client project report');

export const GetProjectReportsSchema = Joi.object({
  projectId: Joi.number()
    .integer()
    .required()
    .description('The project ID to fetch reports for'),
  user: Joi.any().required().description('The authenticated user context'),
}).description('Schema for fetching reports related to a project');

export const ReportIdSchema = Joi.object({
  id: Joi.number()
    .integer()
    .required()
    .description('The unique identifier of the report'),
  user: Joi.any().required().description('The authenticated user context'),
}).description('Schema for operations requiring a single report ID');
