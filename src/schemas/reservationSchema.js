const Joi = require('joi');

const createReservationSchema = Joi.object({
    doctorId: Joi.number().integer().positive().required(),
    patientId: Joi.number().integer().positive().required(),
    timeBlockId: Joi.number().integer().positive().required(),
    reason: Joi.string().max(255).optional().allow('', null),
    notes: Joi.string().max(1000).optional().allow('', null)
});

const updateReservationSchema = Joi.object({
    doctorId: Joi.number().integer().positive(),
    patientId: Joi.number().integer().positive(),
    timeBlockId: Joi.number().integer().positive(),
    reason: Joi.string().max(255).optional().allow('', null),
    notes: Joi.string().max(1000).optional().allow('', null)
}).min(1);

module.exports = {
    createReservationSchema,
    updateReservationSchema
};
