import * as Joi from "joi";
import { PostType, PostStatus } from "../generated/client";

export const CreatePostSchema = Joi.object({
  dto: Joi.object({
    type: Joi.string()
      .valid(...Object.values(PostType))
      .required()
      .description("Type of the post (e.g., ARTICLE, EVENT)"),
    title: Joi.string().required().description("Main title of the post"),
    excerpt: Joi.string()
      .optional()
      .allow("", null)
      .description("Brief summary or introduction"),
    content: Joi.string()
      .required()
      .description("Full body content of the post"),
    coverImage: Joi.string()
      .optional()
      .allow("", null)
      .description("URL to the main cover image"),
    eventDate: Joi.date()
      .iso()
      .optional()
      .description("Scheduled date for events"),
    startTime: Joi.string()
      .optional()
      .allow("", null)
      .description("Start time for events"),
    endTime: Joi.string()
      .optional()
      .allow("", null)
      .description("End time for events"),
    location: Joi.string()
      .optional()
      .allow("", null)
      .description("Physical location for events"),
    externalLink: Joi.string()
      .uri()
      .optional()
      .allow("", null)
      .description("Related external URL"),
    endEventDate: Joi.date()
      .iso()
      .optional()
      .allow(null)
      .description("Scheduled end date for events"),
    hostName: Joi.string()
      .optional()
      .allow("", null)
      .description("Name of the host"),
    privacy: Joi.string()
      .optional()
      .allow("", null)
      .description("Privacy setting"),
    templateId: Joi.string()
      .optional()
      .allow("", null)
      .description("Theme template ID"),
  })
    .required()
    .description("Post creation details"),
  user: Joi.any().required().description("Authenticated user context"),
}).description("Schema for creating a new post");

export const UpdatePostSchema = Joi.object({
  id: Joi.string().required().description("ID of the post to update"),
  dto: Joi.object({
    type: Joi.string()
      .valid(...Object.values(PostType))
      .optional()
      .description("Updated post type"),
    title: Joi.string().optional().description("Updated title"),
    excerpt: Joi.string()
      .optional()
      .allow("", null)
      .description("Updated excerpt"),
    content: Joi.string().optional().description("Updated content"),
    coverImage: Joi.string()
      .optional()
      .allow("", null)
      .description("Updated cover image URL"),
    eventDate: Joi.date().iso().optional().description("Updated event date"),
    startTime: Joi.string()
      .optional()
      .allow("", null)
      .description("Updated start time"),
    endTime: Joi.string()
      .optional()
      .allow("", null)
      .description("Updated end time"),
    location: Joi.string()
      .optional()
      .allow("", null)
      .description("Updated location"),
    externalLink: Joi.string()
      .uri()
      .optional()
      .allow("", null)
      .description("Updated external link"),
    endEventDate: Joi.date()
      .iso()
      .optional()
      .allow(null)
      .description("Updated end event date"),
    hostName: Joi.string()
      .optional()
      .allow("", null)
      .description("Updated host name"),
    privacy: Joi.string()
      .optional()
      .allow("", null)
      .description("Updated privacy"),
    templateId: Joi.string()
      .optional()
      .allow("", null)
      .description("Updated template ID"),
    status: Joi.string()
      .valid(...Object.values(PostStatus))
      .optional()
      .description("Updated moderation status"),
    rejectionReason: Joi.string()
      .optional()
      .allow("", null)
      .description("Reason if post is rejected"),
  })
    .required()
    .description("Post update details"),
  user: Joi.any().required().description("Authenticated user context"),
}).description("Schema for updating an existing post");

export const PostIdSchema = Joi.object({
  id: Joi.string().required().description("Unique identifier of the post"),
  user: Joi.any().optional().description("Authenticated user context"),
  public: Joi.boolean().optional().description("Flag for public access"),
}).description("Schema for operations requiring a post ID");

export const FindAllPostsSchema = Joi.object({
  type: Joi.string()
    .valid(...Object.values(PostType))
    .optional()
    .description("Filter by post type"),
  status: Joi.string()
    .valid(...Object.values(PostStatus))
    .optional()
    .description("Filter by status"),
  page: Joi.number().integer().min(1).default(1).description("Page number"),
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(10)
    .description("Items per page"),
  public: Joi.boolean().optional().description("Public access flag"),
  user: Joi.any().optional().description("Authenticated user context"),
}).description("Schema for fetching multiple posts");

export const ReviewPostSchema = Joi.object({
  id: Joi.string().required().description("ID of the post to review"),
  status: Joi.string()
    .valid(...Object.values(PostStatus))
    .required()
    .description("Moderation status to apply"),
  rejectionReason: Joi.string()
    .optional()
    .allow("", null)
    .description("Explanation if rejected"),
  user: Joi.any().required().description("Authenticated admin user context"),
}).description("Schema for admin moderation of posts");

export const UserOnlySchema = Joi.object({
  user: Joi.any().required().description("Authenticated user context"),
}).description("Schema for operations requiring only user context");
