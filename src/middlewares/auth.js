const jwt = require('jsonwebtoken');
const prisma = require('../utils/prismaClient');

async function authenticateToken(req, res, next) {
    const token = req.header('Authorization')?.split(' ')[1];

    if (!token)
        return res.status(401).json({ error: 'Access Denied, no token provided' });

    jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
        if (err) return res.status(403).json({ error: 'Invalid token' });

        const user = await prisma.user.findUnique({ where: { id: decoded.id } });
        if (!user || user.deletedAt || !user.isActive || user.isSuspended) {
            return res.status(401).json({ error: 'Account inactive or suspended' });
        }

        req.user = decoded;
        next();
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