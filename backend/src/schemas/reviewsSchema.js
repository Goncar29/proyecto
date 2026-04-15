const Joi = require('joi');

/**
 * POST /api/doctors/:id/reviews
 *
 * rating: 1..5 (also enforced at DB level via CHECK constraint — defense in depth).
 * text: optional free-form comment.
 * appointmentId: which COMPLETED appointment backs this review (one review per
 *   appointment, enforced by `Review.appointmentId @unique`).
 */
const createReviewSchema = Joi.object({
    appointmentId: Joi.number().integer().positive().required()
        .messages({
            'number.base': 'El ID de la cita debe ser un número.',
            'any.required': 'La cita es obligatoria para dejar una reseña.',
        }),
    rating: Joi.number().integer().min(1).max(5).required()
        .messages({
            'number.base': 'La calificación debe ser un número.',
            'number.min': 'La calificación mínima es 1.',
            'number.max': 'La calificación máxima es 5.',
            'any.required': 'La calificación es obligatoria.',
        }),
    text: Joi.string().max(2000).allow('').optional()
        .messages({ 'string.max': 'La reseña no puede superar los 2000 caracteres.' }),
});

module.exports = { createReviewSchema };
