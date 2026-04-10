const Joi = require('joi');

const promoteDoctorSchema = Joi.object({
    specialty: Joi.string().min(2).max(100).required(),
    specialties: Joi.array().items(Joi.string().min(2).max(100)).optional(),
    hospital: Joi.string().max(200).allow('').optional(),
    location: Joi.string().max(200).allow('').optional(),
    bio: Joi.string().max(2000).allow('').optional(),
});

module.exports = { promoteDoctorSchema };
