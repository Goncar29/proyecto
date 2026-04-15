const Joi = require('joi');

// Crear un time block
const createTimeBlockSchema = Joi.object({
    doctorId: Joi.when(Joi.ref('$role'), {
        is: 'admin',
        then: Joi.number().integer().positive().required()
            .messages({
                'number.base': 'El ID del doctor debe ser un número.',
                'number.positive': 'El ID del doctor debe ser un número positivo.',
                'any.required': 'El doctor es obligatorio.',
            }),
        otherwise: Joi.forbidden(),
    }),
    startTime: Joi.date().iso().min('now').required()
        .messages({
            'date.base': 'La hora de inicio debe ser una fecha válida.',
            'date.format': 'La hora de inicio debe estar en formato ISO.',
            'date.min': 'La hora de inicio no puede ser en el pasado.',
            'any.required': 'La hora de inicio es obligatoria.',
        }),
    endTime: Joi.date().iso().greater(Joi.ref('startTime')).required()
        .messages({
            'date.base': 'La hora de fin debe ser una fecha válida.',
            'date.format': 'La hora de fin debe estar en formato ISO.',
            'date.greater': 'La hora de fin debe ser posterior a la hora de inicio.',
            'any.required': 'La hora de fin es obligatoria.',
        }),
});

// Actualizar un time block
const updateTimeBlockSchema = Joi.object({
    doctorId: Joi.when(Joi.ref('$role'), {
        is: 'admin',
        then: Joi.number().integer().positive().optional()
            .messages({
                'number.base': 'El ID del doctor debe ser un número.',
                'number.positive': 'El ID del doctor debe ser un número positivo.',
            }),
        otherwise: Joi.forbidden(),
    }),
    startTime: Joi.date().iso().optional()
        .messages({
            'date.base': 'La hora de inicio debe ser una fecha válida.',
            'date.format': 'La hora de inicio debe estar en formato ISO.',
        }),
    endTime: Joi.date().iso().greater(Joi.ref('startTime')).optional()
        .messages({
            'date.base': 'La hora de fin debe ser una fecha válida.',
            'date.greater': 'La hora de fin debe ser posterior a la hora de inicio.',
        }),
}).min(1)
    .messages({
        'object.min': 'Debés enviar al menos un campo para actualizar.',
    });

module.exports = {
    createTimeBlockSchema,
    updateTimeBlockSchema,
};
