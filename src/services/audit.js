// audit.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Registra una acción de auditoría.
 * @param {number} userId - Id del usuario que realizó la acción.
 * @param {string} action - Descripción de la acción (ej. "login", "register").
 * @param {object} [metadata] - Información adicional (IP, UA, etc.).
 */
const logAudit = async (userId, action) => {
    try {
        await prisma.auditLog.create({
            data: {
                userId,
                action,
            },
        });
    } catch (error) {
        // No queremos que la auditoría falle la operación principal
        console.error('[AuditLog] Error al registrar auditoría:', error);
        throw new Error('Error con conexión a la base de datos');
    }
}

const getAuditLogs = async () => {
    return await prisma.auditLog.findMany({
        include: {
            user: { select: { id: true, name: true, email: true, role: true } }
        },
        orderBy: { timestamp: 'desc' }
    });
};

module.exports = { logAudit, getAuditLogs };

