const { logAudit } = require('../services/audit');

/**
 * Middleware de auditoría.
 *
 * Auto-enrichment: agrega { method, path, statusCode, ip } a toda entrada.
 * Extra metadata: los controllers pueden adjuntar datos específicos vía
 *   res.locals.auditMetadata = { changedFields, fromStatus, ... }
 * que se mergean con el auto-enrichment antes de persistir.
 */
const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

const auditMiddleware = (action) => (req, res, next) => {
    res.on('finish', () => {
        // Sin usuario autenticado no hay nada que registrar
        if (!req.user?.id) return;

        const isWrite = WRITE_METHODS.has(req.method);
        const isSuccess = res.statusCode >= 200 && res.statusCode < 300;

        // Lecturas (GET): solo éxito — evitar ruido de 404s en consultas normales
        // Escrituras (POST/PUT/PATCH/DELETE): siempre — los intentos fallidos son auditables
        if (!isWrite && !isSuccess) return;

        const autoMeta = {
            method:     req.method,
            path:       req.originalUrl,
            statusCode: res.statusCode,
            ip:         req.ip,
        };
        const extra = res.locals.auditMetadata ?? {};
        const metadata = { ...autoMeta, ...extra };

        // fire-and-forget — no bloquea la respuesta; errores se logean dentro de logAudit
        logAudit(req.user.id, action || `${req.method} ${req.originalUrl}`, metadata).catch(() => {});
    });
    next();
};

module.exports = auditMiddleware;
