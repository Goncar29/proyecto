const { logAudit } = require('../services/audit');

const auditMiddleware = (action) => (req, res, next) => {
    res.on('finish', () => {
        // Solo registrar si la respuesta fue exitosa
        if (res.statusCode >= 200 && res.statusCode < 300) {
            // fire-and-forget — no bloquea la respuesta; errores se logean dentro de logAudit
            logAudit(req.user?.id, action || `${req.method} ${req.originalUrl}`).catch(() => {});
        }
    });
    next();
};

module.exports = auditMiddleware;
