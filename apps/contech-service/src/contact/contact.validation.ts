import * as Joi from 'joi';

export const ContactInquirySchema = Joi.object({
  name: Joi.string()
    .required()
    .description('Name of the person sending the inquiry'),
  email: Joi.string()
    .email()
    .required()
    .description('Email address for contact'),
  phone: Joi.string().required().description('Phone number of the person'),
  message: Joi.string().required().description('The inquiry message content'),
}).description('Schema for public contact inquiries');
