const Joi = require('joi');

const updateDoctorProfileSchema = Joi.object({
    specialty:   Joi.string().min(2).max(100).optional(),
    specialties: Joi.array().items(Joi.string().min(2).max(100)).optional(),
    hospital:    Joi.string().max(200).allow('', null).optional(),
    location:    Joi.string().max(200).allow('', null).optional(),
    bio:         Joi.string().max(2000).allow('', null).optional(),
    photoUrl:    Joi.string().uri().max(500).allow('', null).optional(),
}).min(1); // al menos un campo requerido

module.exports = { updateDoctorProfileSchema };
