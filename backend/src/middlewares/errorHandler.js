/**
 * Global error handler.
 *
 * Error envelope (spec §1):
 *   { error: string, code?: string, details?: unknown }
 *
 * Services throw plain Errors with `.status` (HTTP code) and optionally
 * `.code` (machine tag) and `.details`. Joi errors are detected via `isJoi`
 * and mapped to 422 VALIDATION.
 */
const errorHandler = (err, req, res, next) => {
    if (err.isJoi) {
        // Keep 400 to stay compatible with existing test suite and the
        // `validate` middleware which also returns 400. New services may
        // still throw errors carrying their own .status/.code/.details.
        return res.status(400).json({
            error: 'Validation failed',
            code: 'VALIDATION',
            details: err.details,
        });
    }

    const status = err.status || 500;

    if (status >= 500) {
        console.error('[ErrorHandler]', err);
        return res.status(500).json({ error: 'Internal Server Error' });
    }

    const payload = { error: err.message };
    if (err.code) payload.code = err.code;
    if (err.details) payload.details = err.details;
    res.status(status).json(payload);
};

module.exports = errorHandler;
