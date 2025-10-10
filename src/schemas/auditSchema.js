const Joi = require('joi');

const auditQuerySchema = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(1000).default(50),
    userId: Joi.number().integer(),
    action: Joi.string().max(255),
    from: Joi.date().iso(),
    to: Joi.date().iso()
});

module.exports = { auditQuerySchema };