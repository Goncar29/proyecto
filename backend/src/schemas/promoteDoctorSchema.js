const Joi = require('joi');

const promoteDoctorSchema = Joi.object({
    specialty: Joi.string().min(2).max(100).required()
        .messages({
            'string.base': 'La especialidad debe ser texto.',
            'string.min': 'La especialidad debe tener al menos 2 caracteres.',
            'string.max': 'La especialidad no puede superar los 100 caracteres.',
            'any.required': 'La especialidad es obligatoria.',
        }),
    specialties: Joi.array().items(Joi.string().min(2).max(100)).optional()
        .messages({
            'array.base': 'Las especialidades deben ser una lista.',
            'string.min': 'Cada especialidad debe tener al menos 2 caracteres.',
            'string.max': 'Cada especialidad no puede superar los 100 caracteres.',
        }),
    hospital: Joi.string().max(200).allow('').optional()
        .messages({ 'string.max': 'El hospital no puede superar los 200 caracteres.' }),
    location: Joi.string().max(200).allow('').optional()
        .messages({ 'string.max': 'La ubicación no puede superar los 200 caracteres.' }),
    bio: Joi.string().max(2000).allow('').optional()
        .messages({ 'string.max': 'La biografía no puede superar los 2000 caracteres.' }),
});

module.exports = { promoteDoctorSchema };
