const Joi = require('joi');

const createAppointmentSchema = Joi.object({
    timeBlockId: Joi.number().integer().positive().required()
        .messages({
            'number.base': 'El bloque de tiempo debe ser un número.',
            'number.positive': 'El bloque de tiempo debe ser un número positivo.',
            'any.required': 'El bloque de tiempo es obligatorio.',
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
const VALID_STATUSES = ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED'];

const listAppointmentsQuerySchema = Joi.object({
    status: Joi.string()
        .custom((value, helpers) => {
            const parts = value.split(',').map(s => s.trim());
            const invalid = parts.find(p => !VALID_STATUSES.includes(p));
            if (invalid) return helpers.error('any.invalid');
            return parts.length === 1 ? parts[0] : parts.join(',');
        })
        .optional()
        .messages({
            'any.invalid': 'El estado debe ser uno de: PENDING, CONFIRMED, CANCELLED, COMPLETED.',
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

const rescheduleAppointmentSchema = Joi.object({
    timeBlockId: Joi.number().integer().positive().required()
        .messages({
            'number.base': 'El nuevo bloque de tiempo debe ser un número.',
            'number.positive': 'El nuevo bloque de tiempo debe ser un número positivo.',
            'any.required': 'El nuevo bloque de tiempo es obligatorio.',
        }),
});

module.exports = {
    createAppointmentSchema,
    listAppointmentsQuerySchema,
    cancelAppointmentSchema,
    confirmAppointmentSchema,
    completeAppointmentSchema,
    rescheduleAppointmentSchema,
};
