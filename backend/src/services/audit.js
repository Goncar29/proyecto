const prisma = require('../utils/prismaClient');

/** Campos que nunca deben aparecer en metadata de auditoría */
const SENSITIVE_KEYS = new Set([
    'password', 'newPassword', 'currentPassword',
    'token', 'refreshToken', 'accessToken', 'secret',
    'apiKey', 'api_key', 'authorization',
]);

const MAX_METADATA_BYTES = 10 * 1024; // 10 KB

/**
 * Sanitiza metadata removiendo campos sensibles (top-level).
 * @param {object} obj
 * @returns {object}
 */
const sanitizeMetadata = (obj) => {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
    return Object.fromEntries(
        Object.entries(obj).filter(([k]) => !SENSITIVE_KEYS.has(k))
    );
};

/**
 * Registra una acción de auditoría.
 * No lanza excepción al caller; devuelve true/false.
 *
 * @param {number}  userId
 * @param {string}  action
 * @param {object}  [metadata]  - Datos extra opcionales. Backwards compatible.
 */
const logAudit = async (userId, action, metadata = null) => {
    if (!userId || !action) {
        require('../utils/logger').warn('[AuditLog] userId o action inválidos, skip');
        return false;
    }
    try {
        let sanitized = null;

        if (metadata && typeof metadata === 'object') {
            const clean = sanitizeMetadata(metadata);
            const serialized = JSON.stringify(clean);
            if (serialized.length > MAX_METADATA_BYTES) {
                sanitized = { truncated: true, originalSize: serialized.length };
            } else {
                sanitized = clean;
            }
        }

        await prisma.auditLog.create({
            data: {
                userId: Number(userId),
                action: String(action),
                ...(sanitized !== null && { metadata: sanitized }),
            }
        });
        return true;
    } catch (error) {
        require('../utils/logger').error({ err: error }, 'AuditLog write failed');
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

    const take = Math.max(1, Math.min(1000, Number(limit)));
    const skip = (Math.max(1, Number(page)) - 1) * take;

    const [items, total] = await prisma.$transaction([
        prisma.auditLog.findMany({
            where,
            include: {
                user: { select: { id: true, name: true, email: true, role: true } }
            },
            orderBy: { timestamp: 'desc' },
            skip,
            take,
        }),
        prisma.auditLog.count({ where }),
    ]);

    return { items, total, page: Math.max(1, Number(page)), pageSize: take };
};

module.exports = { logAudit, getAuditLogs };

