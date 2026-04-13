/**
 * Global error handler.
 *
 * Error envelope:
 *   { error: string, code?: string, details?: unknown }
 *
 * Handles: Joi validation errors, Prisma known-request errors,
 * and service-thrown errors with .status/.code/.details.
 */

const PRISMA_ERROR_MAP = {
    P2002: { status: 409, code: 'DUPLICATE',   msg: 'Resource already exists' },
    P2025: { status: 404, code: 'NOT_FOUND',   msg: 'Resource not found' },
    P2003: { status: 409, code: 'FK_VIOLATION', msg: 'Referenced resource does not exist' },
};

const errorHandler = (err, req, res, next) => {
    // Joi validation
    if (err.isJoi) {
        return res.status(400).json({
            error: 'Validation failed',
            code: 'VALIDATION',
            details: err.details,
        });
    }

    // Prisma known-request errors (PrismaClientKnownRequestError)
    if (err.code && PRISMA_ERROR_MAP[err.code] && err.meta) {
        const mapped = PRISMA_ERROR_MAP[err.code];
        return res.status(mapped.status).json({
            error: mapped.msg,
            code: mapped.code,
        });
    }

    // Body parser errors (payload too large, malformed JSON)
    if (err.type === 'entity.too.large') {
        return res.status(413).json({ error: 'Payload too large', code: 'PAYLOAD_TOO_LARGE' });
    }
    if (err.type === 'entity.parse.failed') {
        return res.status(400).json({ error: 'Malformed JSON', code: 'BAD_JSON' });
    }

    const status = err.status || 500;

    if (status >= 500) {
        require('../utils/logger').error({ err }, 'Unhandled server error');
        return res.status(500).json({ error: 'Internal Server Error' });
    }

    const payload = { error: err.message };
    if (err.code) payload.code = err.code;
    if (err.details) payload.details = err.details;
    res.status(status).json(payload);
};

module.exports = errorHandler;
