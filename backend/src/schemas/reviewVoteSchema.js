const Joi = require('joi');

const voteSchema = Joi.object({
    value: Joi.number().integer().valid(1, -1).required()
        .messages({
            'number.base': 'El valor debe ser un número.',
            'number.integer': 'El valor debe ser un número entero.',
            'any.only': 'El valor debe ser 1 (útil) o -1 (no útil).',
            'any.required': 'El valor es obligatorio.',
        }),
});

module.exports = { voteSchema };
