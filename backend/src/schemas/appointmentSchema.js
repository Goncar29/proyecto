const Joi = require('joi');

const createAppointmentSchema = Joi.object({
    timeBlockId: Joi.number().integer().positive().required(),
    doctorId: Joi.number().integer().positive().required(),
    reason: Joi.string().max(500).optional(),
    notes: Joi.string().max(500).optional(),
});

/**
 * Query filter schema for GET /api/users/:id/appointments.
 * All fields optional. `from`/`to` bound the TimeBlock date window.
 */
const listAppointmentsQuerySchema = Joi.object({
    status: Joi.string()
        .valid('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED')
        .optional(),
    from: Joi.date().iso().optional(),
    to: Joi.date().iso().optional(),
    page: Joi.number().integer().min(1).default(1),
    pageSize: Joi.number().integer().min(1).max(50).default(12),
});

const cancelAppointmentSchema = Joi.object({
    reason: Joi.string().max(500).optional(),
});

const confirmAppointmentSchema = Joi.object({
    notes: Joi.string().max(500).optional(),
});

const completeAppointmentSchema = Joi.object({
    notes: Joi.string().max(500).optional(),
});

module.exports = {
    createAppointmentSchema,
    listAppointmentsQuerySchema,
    cancelAppointmentSchema,
    confirmAppointmentSchema,
    completeAppointmentSchema,
};
