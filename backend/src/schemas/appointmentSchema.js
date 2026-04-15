const Joi = require('joi');

const createAppointmentSchema = Joi.object({
    timeBlockId: Joi.number().integer().positive().required()
        .messages({
            'number.base': 'El bloque de tiempo debe ser un número.',
            'number.positive': 'El bloque de tiempo debe ser un número positivo.',
            'any.required': 'El bloque de tiempo es obligatorio.',
        }),
    doctorId: Joi.number().integer().positive().required()
        .messages({
            'number.base': 'El ID del doctor debe ser un número.',
            'number.positive': 'El ID del doctor debe ser un número positivo.',
            'any.required': 'El doctor es obligatorio.',
        }),
    reason: Joi.string().max(500).optional()
        .messages({
            'string.max': 'El motivo no puede superar los 500 caracteres.',
        }),
    notes: Joi.string().max(500).optional()
        .messages({
            'string.max': 'Las notas no pueden superar los 500 caracteres.',
        }),
});

/**
 * Query filter schema for GET /api/users/:id/appointments.
 * All fields optional. `from`/`to` bound the TimeBlock date window.
 */
const listAppointmentsQuerySchema = Joi.object({
    status: Joi.string()
        .valid('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED')
        .optional()
        .messages({
            'any.only': 'El estado debe ser uno de: PENDING, CONFIRMED, CANCELLED, COMPLETED.',
        }),
    from: Joi.date().iso().optional()
        .messages({ 'date.format': 'La fecha "desde" debe estar en formato ISO.' }),
    to: Joi.date().iso().optional()
        .messages({ 'date.format': 'La fecha "hasta" debe estar en formato ISO.' }),
    page: Joi.number().integer().min(1).default(1)
        .messages({ 'number.min': 'La página debe ser mayor a 0.' }),
    pageSize: Joi.number().integer().min(1).max(50).default(12)
        .messages({
            'number.min': 'El tamaño de página debe ser al menos 1.',
            'number.max': 'El tamaño de página no puede superar 50.',
        }),
});

const cancelAppointmentSchema = Joi.object({
    reason: Joi.string().max(500).optional()
        .messages({ 'string.max': 'El motivo no puede superar los 500 caracteres.' }),
});

const confirmAppointmentSchema = Joi.object({
    notes: Joi.string().max(500).optional()
        .messages({ 'string.max': 'Las notas no pueden superar los 500 caracteres.' }),
});

const completeAppointmentSchema = Joi.object({
    notes: Joi.string().max(500).optional()
        .messages({ 'string.max': 'Las notas no pueden superar los 500 caracteres.' }),
});

module.exports = {
    createAppointmentSchema,
    listAppointmentsQuerySchema,
    cancelAppointmentSchema,
    confirmAppointmentSchema,
    completeAppointmentSchema,
};
