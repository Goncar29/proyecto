const Joi = require('joi');

const createReservationSchema = Joi.object({
    doctorId: Joi.number().integer().positive().required()
        .messages({
            'number.base': 'El ID del doctor debe ser un número.',
            'any.required': 'El doctor es obligatorio.',
        }),
    patientId: Joi.number().integer().positive().required()
        .messages({
            'number.base': 'El ID del paciente debe ser un número.',
            'any.required': 'El paciente es obligatorio.',
        }),
    timeBlockId: Joi.number().integer().positive().required()
        .messages({
            'number.base': 'El bloque de tiempo debe ser un número.',
            'any.required': 'El bloque de tiempo es obligatorio.',
        }),
    reason: Joi.string().max(255).optional().allow('', null)
        .messages({ 'string.max': 'El motivo no puede superar los 255 caracteres.' }),
    notes: Joi.string().max(1000).optional().allow('', null)
        .messages({ 'string.max': 'Las notas no pueden superar los 1000 caracteres.' }),
});

const updateReservationSchema = Joi.object({
    doctorId: Joi.number().integer().positive()
        .messages({ 'number.base': 'El ID del doctor debe ser un número.' }),
    patientId: Joi.number().integer().positive()
        .messages({ 'number.base': 'El ID del paciente debe ser un número.' }),
    timeBlockId: Joi.number().integer().positive()
        .messages({ 'number.base': 'El bloque de tiempo debe ser un número.' }),
    reason: Joi.string().max(255).optional().allow('', null)
        .messages({ 'string.max': 'El motivo no puede superar los 255 caracteres.' }),
    notes: Joi.string().max(1000).optional().allow('', null)
        .messages({ 'string.max': 'Las notas no pueden superar los 1000 caracteres.' }),
}).min(1)
    .messages({ 'object.min': 'Debés enviar al menos un campo para actualizar.' });

module.exports = {
    createReservationSchema,
    updateReservationSchema,
};
