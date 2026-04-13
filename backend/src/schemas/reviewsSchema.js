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
    appointmentId: Joi.number().integer().positive().required(),
    rating: Joi.number().integer().min(1).max(5).required(),
    text: Joi.string().max(2000).allow('').optional(),
});

module.exports = { createReviewSchema };
