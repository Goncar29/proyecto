/**
 * Request timeout middleware.
 * Aborts the request with 503 if it exceeds the configured duration.
 */
const DEFAULT_TIMEOUT_MS = 30_000;

const timeout = (ms = DEFAULT_TIMEOUT_MS) => (req, res, next) => {
    const timer = setTimeout(() => {
        if (!res.headersSent) {
            res.status(503).json({ error: 'Request timeout', code: 'TIMEOUT' });
        }
    }, ms);

    res.on('finish', () => clearTimeout(timer));
    res.on('close', () => clearTimeout(timer));
    next();
};

module.exports = timeout;
