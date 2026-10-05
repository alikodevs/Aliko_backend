import * as Joi from "joi";
import { EventsRole } from "../generated/client";

export const GetEventsProfileSchema = Joi.object({
  user: Joi.any().required().description("The authenticated user context"),
}).description("Schema for fetching Events user profile");

export const UpdateUserRoleSchema = Joi.object({
  userId: Joi.string()
    .required()
    .description("Firebase UID of the user to update"),
  role: Joi.string()
    .valid(...Object.values(EventsRole))
    .required()
    .description("New Events role to assign"),
  user: Joi.any().required().description("The authenticated admin user domain"),
}).description("Schema for administrative role updates");

export const UserCreatedEventSchema = Joi.object({
  userId: Joi.string().required().description("ID of the created user"),
  email: Joi.string()
    .email()
    .required()
    .description("Email of the created user"),
  role: Joi.string().required().description("Primary role assigned"),
  globalRole: Joi.string().optional().description("Global system role"),
  user: Joi.any().optional(), // Metadata if present
}).description("Schema for user creation events from auth service");

export const UserIdSchema = Joi.object({
  userId: Joi.string().required(),
  user: Joi.any().required(),
});

export const EmptyPayloadWithUserSchema = Joi.object({
  user: Joi.any().required(),
});
