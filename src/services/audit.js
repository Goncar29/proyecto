// audit.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Registra una acción de auditoría.
 * @param {number} userId - Id del usuario que realizó la acción.
 * @param {string} action - Descripción de la acción (ej. "login", "register").
 * @param {object} [metadata] - Información adicional (IP, UA, etc.).
 */
async function logAudit(userId, action, metadata = {}) {
    try {
        await prisma.auditLog.create({
            data: {
                userId,
                action,
                metadata,          // Prisma soporta JSONB en Postgres
            },
        });
    } catch (e) {
        // No queremos que la auditoría falle la operación principal
        console.error('[AuditLog] Error al registrar auditoría:', e);
    }
}

module.exports = { logAudit };
