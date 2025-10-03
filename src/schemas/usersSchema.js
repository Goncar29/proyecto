const Joi = require('joi');

const registerSchema = Joi.object({
    name: Joi.string().min(2).max(100).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
    role: Joi.string().valid('patient', 'doctor', 'admin').required()
});

const loginSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required()
});

const updateUserSchema = Joi.object({
    name: Joi.string().min(3).max(100).optional(),
    email: Joi.string().email().optional(),
    password: Joi.string().min(8).optional()
}).min(1);

module.exports = {
    registerSchema,
    loginSchema,
    updateUserSchema
};
