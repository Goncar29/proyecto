// audit.js
const prisma = require('../utils/prismaClient');

/**
 * Registra una acción de auditoría.
 * No lanza excepción al caller; devuelve true/false.
 */
const logAudit = async (userId, action) => {
    if (!userId || !action) {
        console.warn('[AuditLog] userId o action inválidos, skip');
        return false;
    }
    try {
        await prisma.auditLog.create({
            data: {
                userId: Number(userId),
                action: String(action)
            }
        });
        return true;
    } catch (error) {
        console.error('[AuditLog] Error al registrar auditoría:', error);
        return false;
    }
};

/**
 * Obtiene registros con paginación y filtros opcionales.
 * options: { page = 1, limit = 50, userId, action, from, to }
 */
const getAuditLogs = async (options = {}) => {
    const {
        page = 1,
        limit = 50,
        userId,
        action,
        from,
        to
    } = options;

    const where = {};
    if (userId) where.userId = Number(userId);
    if (action) where.action = { contains: String(action), mode: 'insensitive' };
    if (from || to) where.timestamp = {};
    if (from) where.timestamp.gte = new Date(from);
    if (to) where.timestamp.lte = new Date(to);

    const skip = (Math.max(1, Number(page)) - 1) * Math.max(1, Number(limit));

    const logs = await prisma.auditLog.findMany({
        where,
        include: {
            user: { select: { id: true, name: true, email: true, role: true } }
        },
        orderBy: { timestamp: 'desc' }, // confirmar nombre del campo en schema
        skip,
        take: Math.max(1, Math.min(1000, Number(limit)))
    });

    return logs;
};

module.exports = { logAudit, getAuditLogs };

