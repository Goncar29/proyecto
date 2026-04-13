const Joi = require('joi');

/**
 * Joi schemas for public doctor endpoints (spec §1.2, §1.4, §1.5).
 * All schemas validate `req.query` (source: 'query').
 */

const listQuerySchema = Joi.object({
    q: Joi.string().trim().max(100).optional(),
    specialty: Joi.string().trim().max(80).optional(),
    location: Joi.string().trim().max(80).optional(),
    availability: Joi.string().valid('today', 'week', 'month', 'any').default('any'),
    featured: Joi.boolean().truthy('true').falsy('false').default(false),
    page: Joi.number().integer().min(1).default(1),
    pageSize: Joi.number().integer().min(1).max(50).default(12),
    limit: Joi.number().integer().min(1).max(50).optional(), // alias for featured usage
});

const reviewsQuerySchema = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    pageSize: Joi.number().integer().min(1).max(50).default(10),
    sort: Joi.string().valid('recent', 'rating_desc', 'rating_asc').default('recent'),
});

const availabilityQuerySchema = Joi.object({
    from: Joi.date().iso().optional(),
    to: Joi.date().iso().optional(),
    date: Joi.date().iso().optional(),
}).custom((value, helpers) => {
    // Normalize: if `date` is provided, from=to=date
    if (value.date) {
        value.from = value.date;
        value.to = value.date;
    }
    const from = value.from ? new Date(value.from) : startOfToday();
    const to = value.to ? new Date(value.to) : addDays(from, 30);
    if (to < from) {
        return helpers.error('any.invalid', { message: 'to must be >= from' });
    }
    const span = Math.round((to - from) / (1000 * 60 * 60 * 24));
    if (span > 60) {
        return helpers.error('any.invalid', { message: 'range must be <= 60 days' });
    }
    value.from = from;
    value.to = to;
    return value;
});

function startOfToday() {
    const d = new Date();
    d.setUTCHours(0, 0, 0, 0);
    return d;
}

function addDays(d, n) {
    const copy = new Date(d);
    copy.setUTCDate(copy.getUTCDate() + n);
    return copy;
}

module.exports = {
    listQuerySchema,
    reviewsQuerySchema,
    availabilityQuerySchema,
};
