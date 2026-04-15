const Joi = require('joi');

const registerSchema = Joi.object({
    name: Joi.string().min(2).max(100).required()
        .messages({
            'string.base': 'El nombre debe ser texto.',
            'string.empty': 'El nombre es obligatorio.',
            'string.min': 'El nombre debe tener al menos 2 caracteres.',
            'string.max': 'El nombre no puede superar los 100 caracteres.',
            'any.required': 'El nombre es obligatorio.',
        }),
    email: Joi.string().email({ tlds: false }).required()
        .messages({
            'string.base': 'El email debe ser texto.',
            'string.empty': 'El email es obligatorio.',
            'string.email': 'El email no tiene un formato válido.',
            'any.required': 'El email es obligatorio.',
        }),
    password: Joi.string().min(8).required()
        .messages({
            'string.base': 'La contraseña debe ser texto.',
            'string.empty': 'La contraseña es obligatoria.',
            'string.min': 'La contraseña debe tener al menos 8 caracteres.',
            'any.required': 'La contraseña es obligatoria.',
        }),
});

const loginSchema = Joi.object({
    email: Joi.string().email({ tlds: false }).required()
        .messages({
            'string.empty': 'El email es obligatorio.',
            'string.email': 'El email no tiene un formato válido.',
            'any.required': 'El email es obligatorio.',
        }),
    password: Joi.string().min(8).required()
        .messages({
            'string.empty': 'La contraseña es obligatoria.',
            'string.min': 'La contraseña debe tener al menos 8 caracteres.',
            'any.required': 'La contraseña es obligatoria.',
        }),
});

const updateUserSchema = Joi.object({
    name: Joi.string().min(3).max(100).optional()
        .messages({
            'string.min': 'El nombre debe tener al menos 3 caracteres.',
            'string.max': 'El nombre no puede superar los 100 caracteres.',
        }),
    email: Joi.string().email({ tlds: false }).optional()
        .messages({
            'string.email': 'El email no tiene un formato válido.',
        }),
    password: Joi.string().min(8).optional()
        .messages({
            'string.min': 'La contraseña debe tener al menos 8 caracteres.',
        }),
}).min(1)
    .messages({
        'object.min': 'Debés enviar al menos un campo para actualizar.',
    });

module.exports = {
    registerSchema,
    loginSchema,
    updateUserSchema,
};
