const { logAudit } = require('../services/audit');

const auditMiddleware = (action) => async (req, res, next) => {
    res.on('finish', async () => {
        // Solo registrar si la respuesta fue exitosa
        if (res.statusCode >= 200 && res.statusCode < 300) {
            await logAudit(req.user?.id, action || `${req.method} ${req.originalUrl}`);
        }
    });
    next();
};

module.exports = auditMiddleware;
