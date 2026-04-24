const crypto = require('crypto');
const prisma = require('../utils/prismaClient');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { logAudit } = require('./audit');
const {
    SALT_ROUNDS,
    JWT_SECRET,
    JWT_EXPIRES_IN,
    REFRESH_TOKEN_SECRET,
    REFRESH_TOKEN_EXPIRES_IN,
    REFRESH_TOKEN_MAX_AGE_MS,
} = require('../config');

/** sha256 hex digest — same pattern as password reset tokens */
const sha256 = (plain) => crypto.createHash('sha256').update(plain).digest('hex');

const registerUser = async (email, password, name) => {
    if (!email || !password || !name) {
        throw new Error('Email, password y nombre son obligatorios.');
    }
    if (password.length < 8) {
        throw new Error('La contraseña debe tener al menos 8 caracteres.');
    }
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    try {
        const newUser = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                name,
                role: 'PATIENT'
            },
            select: { id: true, email: true, name: true, role: true }, // no devolver password
        });
        await logAudit(newUser.id, 'register');
        return newUser;
    } catch (error) {
        require('../utils/logger').error({ err: error }, 'User registration failed');
        if (error.code === 'P2002') throw new Error('Ya existe una cuenta con ese email.');
        throw new Error('Error al crear la cuenta. Intentá de nuevo más tarde.');
    }
};

/**
 * Issue a short-lived access token (JWT) + a long-lived refresh token.
 * Returns { accessToken, refreshTokenPlain } — caller sets the cookie.
 */
const loginUser = async (email, password) => {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new Error('Usuario y/o contraseña incorrecta');
    if (user.deletedAt) throw new Error('Usuario y/o contraseña incorrecta');
    if (!user.isActive) throw new Error('Usuario y/o contraseña incorrecta');
    if (user.isSuspended) throw new Error('Usuario y/o contraseña incorrecta');

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
        throw new Error('Usuario y/o contraseña incorrecta');
    }

    const accessToken = jwt.sign(
        { id: user.id, role: user.role.toLowerCase() },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
    );

    // Generate refresh token — store only the hash in DB
    const refreshTokenPlain = crypto.randomBytes(40).toString('hex'); // 80 chars
    const tokenHash = sha256(refreshTokenPlain);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_MAX_AGE_MS);

    // Revoke any existing active refresh tokens for this user (single active session)
    await prisma.refreshToken.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: new Date() },
    });

    await prisma.refreshToken.create({
        data: { userId: user.id, tokenHash, expiresAt },
    });

    await logAudit(user.id, 'login');
    return { accessToken, refreshTokenPlain };
};

/**
 * Rotate a refresh token: revoke the current one, issue a new pair.
 * Returns { accessToken, refreshTokenPlain } or throws.
 */
const refreshAccessToken = async (refreshTokenPlain) => {
    if (!refreshTokenPlain) {
        const err = new Error('Refresh token requerido');
        err.status = 401; err.code = 'UNAUTHORIZED'; throw err;
    }

    const tokenHash = sha256(refreshTokenPlain);
    const stored = await prisma.refreshToken.findUnique({
        where: { tokenHash },
        include: { user: true },
    });

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
        const err = new Error('Refresh token inválido o expirado');
        err.status = 401; err.code = 'UNAUTHORIZED'; throw err;
    }

    const { user } = stored;
    if (user.deletedAt || !user.isActive || user.isSuspended) {
        const err = new Error('Usuario inactivo');
        err.status = 401; err.code = 'UNAUTHORIZED'; throw err;
    }

    // Revoke old token (rotation — each refresh issues a new pair)
    await prisma.refreshToken.update({
        where: { id: stored.id },
        data: { revokedAt: new Date() },
    });

    // New access token
    const accessToken = jwt.sign(
        { id: user.id, role: user.role.toLowerCase() },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
    );

    // New refresh token
    const newRefreshTokenPlain = crypto.randomBytes(40).toString('hex');
    const newTokenHash = sha256(newRefreshTokenPlain);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_MAX_AGE_MS);

    await prisma.refreshToken.create({
        data: { userId: user.id, tokenHash: newTokenHash, expiresAt },
    });

    return { accessToken, refreshTokenPlain: newRefreshTokenPlain };
};

/**
 * Revoke the refresh token on logout.
 * Silent if token not found — idempotent.
 */
const logoutUser = async (refreshTokenPlain) => {
    if (!refreshTokenPlain) return;
    const tokenHash = sha256(refreshTokenPlain);
    // Buscar userId antes de revocar para poder auditarlo
    const stored = await prisma.refreshToken.findUnique({
        where: { tokenHash },
        select: { userId: true },
    }).catch(() => null);
    await prisma.refreshToken.updateMany({
        where: { tokenHash, revokedAt: null },
        data: { revokedAt: new Date() },
    }).catch(() => {}); // silent — don't break logout if DB fails
    if (stored?.userId) await logAudit(stored.userId, 'logout').catch(() => {});
};

/**
 * Fetch the authenticated user for GET /api/auth/me.
 * Filters soft-deleted / suspended / inactive — if any of those slipped
 * through the JWT (token issued before status change), we surface 401.
 */
const getCurrentUser = async (userId) => {
    const user = await prisma.user.findFirst({
        where: {
            id: userId,
            deletedAt: null,
            isActive: true,
            isSuspended: false,
        },
        select: {
            id: true,
            email: true,
            name: true,
            role: true,
            photoUrl: true,
            createdAt: true,
        },
    });
    if (!user) {
        const err = new Error('Usuario no encontrado');
        err.status = 401;
        err.code = 'UNAUTHORIZED';
        throw err;
    }
    return user;
};

module.exports = {
    registerUser,
    loginUser,
    refreshAccessToken,
    logoutUser,
    getCurrentUser,
};
