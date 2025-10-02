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

module.exports = {
    registerSchema,
    loginSchema
};
