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

// Crear bloques de tiempo en masa (admin only)
const bulkCreateTimeBlockSchema = Joi.object({
    doctorId: Joi.number().integer().positive().required()
        .messages({
            'number.base': 'El ID del doctor debe ser un número.',
            'number.positive': 'El ID del doctor debe ser un número positivo.',
            'any.required': 'El doctor es obligatorio.',
        }),
    startDate: Joi.date().iso().required()
        .messages({
            'date.base': 'La fecha de inicio debe ser una fecha válida.',
            'any.required': 'La fecha de inicio es obligatoria.',
        }),
    endDate: Joi.date().iso().min(Joi.ref('startDate')).required()
        .messages({
            'date.base': 'La fecha de fin debe ser una fecha válida.',
            'date.min': 'La fecha de fin debe ser igual o posterior a la fecha de inicio.',
            'any.required': 'La fecha de fin es obligatoria.',
        }),
    daysOfWeek: Joi.array()
        .items(Joi.number().integer().min(0).max(6))
        .min(1)
        .unique()
        .required()
        .messages({
            'array.base': 'Los días de la semana deben ser un arreglo.',
            'array.min': 'Debés seleccionar al menos un día de la semana.',
            'any.required': 'Los días de la semana son obligatorios.',
        }),
    startHour: Joi.number().integer().min(0).max(23).required()
        .messages({
            'number.base': 'La hora de inicio debe ser un número.',
            'number.min': 'La hora de inicio debe ser entre 0 y 23.',
            'number.max': 'La hora de inicio debe ser entre 0 y 23.',
            'any.required': 'La hora de inicio es obligatoria.',
        }),
    endHour: Joi.number().integer().min(1).max(24).greater(Joi.ref('startHour')).required()
        .messages({
            'number.base': 'La hora de fin debe ser un número.',
            'number.greater': 'La hora de fin debe ser posterior a la hora de inicio.',
            'any.required': 'La hora de fin es obligatoria.',
        }),
    slotDurationMin: Joi.number().integer().min(15).max(480).required()
        .messages({
            'number.base': 'La duración del slot debe ser un número.',
            'number.min': 'La duración mínima es 15 minutos.',
            'number.max': 'La duración máxima es 480 minutos (8 horas).',
            'any.required': 'La duración del slot es obligatoria.',
        }),
});

module.exports = {
    createTimeBlockSchema,
    updateTimeBlockSchema,
    bulkCreateTimeBlockSchema,
};
