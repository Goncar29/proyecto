const { logAudit } = require('../services/audit');

/**
 * Middleware de auditoría.
 *
 * Auto-enrichment: agrega { method, path, statusCode, ip } a toda entrada.
 * Extra metadata: los controllers pueden adjuntar datos específicos vía
 *   res.locals.auditMetadata = { changedFields, fromStatus, ... }
 * que se mergean con el auto-enrichment antes de persistir.
 */
const auditMiddleware = (action) => (req, res, next) => {
    res.on('finish', () => {
        // Solo registrar si la respuesta fue exitosa
        if (res.statusCode >= 200 && res.statusCode < 300) {
            const autoMeta = {
                method:     req.method,
                path:       req.originalUrl,
                statusCode: res.statusCode,
                ip:         req.ip,
            };
            // Merge con metadata específica del controller (si existe)
            const extra = res.locals.auditMetadata ?? {};
            const metadata = { ...autoMeta, ...extra };

            // fire-and-forget — no bloquea la respuesta; errores se logean dentro de logAudit
            logAudit(req.user?.id, action || `${req.method} ${req.originalUrl}`, metadata).catch(() => {});
        }
    });
    next();
};

module.exports = auditMiddleware;
