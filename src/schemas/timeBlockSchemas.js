const Joi = require('joi');

const createTimeBlockSchema = Joi.object({
    doctorId: Joi.number().integer().positive().required(),
    startTime: Joi.date().required(),
    endTime: Joi.date().greater(Joi.ref('startTime')).required()
});

const updateTimeBlockSchema = Joi.object({
    doctorId: Joi.number().integer().positive().optional(),
    startTime: Joi.date().optional(),
    endTime: Joi.date().greater(Joi.ref('startTime')).optional()
}).min(1);

module.exports = {
    createTimeBlockSchema,
    updateTimeBlockSchema
};
