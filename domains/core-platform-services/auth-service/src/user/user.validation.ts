import * as Joi from 'joi';

export const GetUserProfileSchema = Joi.object({
  firebaseId: Joi.string().required().description('Firebase unique identifier of the user'),
}).description('Schema for fetching a user profile');

export const UpdateUserProfileSchema = Joi.object({
  firebaseId: Joi.string().required().description('Firebase UID of the user to update'),
  dto: Joi.object().required().unknown().description('Updated profile data'),
}).description('Schema for updating user profile');

export const GetUsersByIdsSchema = Joi.object({
  userIds: Joi.array().items(Joi.string()).required().description('List of firebase IDs to fetch'),
}).description('Schema for fetching multiple user profiles');

export const UpdateContechRoleSchema = Joi.object({
  userId: Joi.string().required().description('Firebase UID of the user'),
  role: Joi.string().required().description('The new ConTech role to assign'),
}).description('Schema for updating ConTech domain role');
