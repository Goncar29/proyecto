const Joi = require('joi');

const createAppointmentSchema = Joi.object({
    timeBlockId: Joi.number().integer().positive().required(),
    doctorId: Joi.number().integer().positive().required(),
    reason: Joi.string().max(500).optional(),
    notes: Joi.string().max(500).optional(),
});

module.exports = { createAppointmentSchema };
