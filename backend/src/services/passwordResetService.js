const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const prisma = require('../utils/prismaClient');
const { logAudit } = require('./audit');
const { sendPasswordResetEmail } = require('../utils/email');
const { SALT_ROUNDS } = require('../config');
const logger = require('../utils/logger');

const TOKEN_TTL_MS = 30 * 60 * 1000; // 30 minutos

const hashToken = (tokenPlain) =>
    crypto.createHash('sha256').update(tokenPlain).digest('hex');

/**
 * Inicia el flujo de recuperación. No revela si el email existe o no
 * (enumeration prevention). Siempre resuelve.
 */
const requestPasswordReset = async (email) => {
    const user = await prisma.user.findUnique({ where: { email } });

    // Silent return para emails inexistentes o soft-deleted / inactivos
    if (!user || user.deletedAt || !user.isActive || user.isSuspended) {
        return;
    }

    const tokenPlain = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashToken(tokenPlain);
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

    // Cleanup: borrar tokens viejos sin usar del mismo user
    await prisma.passwordResetToken.deleteMany({
        where: { userId: user.id, usedAt: null },
    });

    await prisma.passwordResetToken.create({
        data: { userId: user.id, tokenHash, expiresAt },
    });

    const appUrl = process.env.APP_URL || 'http://localhost:5173';
    const resetUrl = `${appUrl}/reset-password?token=${tokenPlain}`;

    await sendPasswordResetEmail(user.email, resetUrl);
    await logAudit(user.id, 'password_reset_requested');
};

/**
 * Consume un token y actualiza la password.
 * Todos los errores devuelven el mismo 400 genérico (no revelar detalle).
 */
const resetPassword = async (tokenPlain, newPassword) => {
    const tokenHash = hashToken(tokenPlain);
    const invalid = () => {
        const err = new Error('El link de recuperación es inválido o expiró.');
        err.status = 400;
        err.code = 'INVALID_TOKEN';
        return err;
    };

    const record = await prisma.passwordResetToken.findUnique({
        where: { tokenHash },
        include: { user: true },
    });

    if (!record) throw invalid();
    if (record.usedAt) throw invalid();
    if (record.expiresAt < new Date()) throw invalid();

    const { user } = record;
    if (!user || user.deletedAt || !user.isActive || user.isSuspended) {
        throw invalid();
    }

    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);

    await prisma.$transaction([
        prisma.user.update({
            where: { id: user.id },
            data: { password: hashedPassword },
        }),
        prisma.passwordResetToken.update({
            where: { id: record.id },
            data: { usedAt: new Date() },
        }),
    ]);

    await logAudit(user.id, 'password_reset_completed');
    logger.info({ userId: user.id }, 'Password reset completed');
};

module.exports = { requestPasswordReset, resetPassword, hashToken, TOKEN_TTL_MS };
