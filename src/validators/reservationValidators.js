const Joi = require('joi');

const createReservationSchema = Joi.object({
    doctorId: Joi.number().integer().positive().required(),
    timeBlockId: Joi.number().integer().positive().required(),
    reason: Joi.string().max(255).optional().allow('', null),
    notes: Joi.string().max(1000).optional().allow('', null)
});

const updateReservationSchema = Joi.object({
    doctorId: Joi.number().integer().positive().optional(),
    timeBlockId: Joi.number().integer().positive().optional(),
    patientId: Joi.number().integer().positive().optional(),
    reason: Joi.string().max(255).optional().allow('', null),
    notes: Joi.string().max(1000).optional().allow('', null)
}).min(1); // al menos un campo

module.exports = {
    createReservationSchema,
    updateReservationSchema
};