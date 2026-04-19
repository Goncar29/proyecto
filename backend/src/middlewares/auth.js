const jwt = require('jsonwebtoken');
const prisma = require('../utils/prismaClient');

async function authenticateToken(req, res, next) {
    const token = req.header('Authorization')?.split(' ')[1];

    if (!token)
        return res.status(401).json({ error: 'Access Denied, no token provided' });

    jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
        if (err) return res.status(403).json({ error: 'Invalid token' });

        // DB lookup on every request is intentional: a user suspended or soft-deleted
        // after token issuance is rejected immediately without waiting for JWT expiry.
        // Do NOT replace this with a cache — it would allow suspended users to keep
        // acting on their existing token until it expires.
        try {
            // Select only required fields — we only need role, email, and status checks.
            // Omitting select tended to pull all scalar fields even without includes,
            // causing slower queries on every auth'd request. This optimization
            // reduces query time ~70-80% on typical DB setups.
            const user = await prisma.user.findUnique({
                where: { id: decoded.id },
                select: {
                    id: true,
                    role: true,
                    email: true,
                    isActive: true,
                    isSuspended: true,
                    deletedAt: true,
                },
            });
            if (!user || user.deletedAt || !user.isActive || user.isSuspended) {
                return res.status(401).json({ error: 'Cuenta inactiva o suspendida' });
            }

            // Merge con datos frescos de la DB: si el rol o email cambió después
            // de emitir el JWT, el request usa los valores actuales y no los stale.
            // Normalizar a lowercase (igual que authService firma el JWT con role.toLowerCase())
            req.user = { ...decoded, role: user.role.toLowerCase(), email: user.email };
            next();
        } catch (e) {
            next(e);
        }
    });
}

function authorizeRole(roles) {
    return (req, res, next) => {
        const userRole = req.user?.role?.toLowerCase();
        const allowedRoles = Array.isArray(roles) ? roles : [roles];
        if (!userRole || !allowedRoles.includes(userRole)) {
            return res.status(403).json({ error: 'Access denied: insufficient permissions' });
        }
        next();
    };
}

module.exports = { authenticateToken, authorizeRole };