const Joi = require('joi');

// Crear un time block
const createTimeBlockSchema = Joi.object({
    doctorId: Joi.when(Joi.ref('$role'), {
        is: 'admin',
        then: Joi.number().integer().positive().required(), // admin debe indicar doctorId
        otherwise: Joi.forbidden(), // doctor no puede enviarlo (se asigna automáticamente)
    }),
    startTime: Joi.date().iso().required(),
    endTime: Joi.date().iso().greater(Joi.ref('startTime')).required(),
});

// Actualizar un time block
const updateTimeBlockSchema = Joi.object({
    doctorId: Joi.when(Joi.ref('$role'), {
        is: 'admin',
        then: Joi.number().integer().positive().optional(),
        otherwise: Joi.forbidden(),
    }),
    startTime: Joi.date().iso().optional(),
    endTime: Joi.date().iso().greater(Joi.ref('startTime')).optional(),
}).min(1); // al menos un campo para actualizar

module.exports = {
    createTimeBlockSchema,
    updateTimeBlockSchema,
};

