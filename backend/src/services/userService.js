const prisma = require('../utils/prismaClient');
const bcrypt = require('bcryptjs');
const { SALT_ROUNDS } = require('../config');

const publicSelect = {
    id: true,
    email: true,
    name: true,
    role: true,
    isActive: true,
    isSuspended: true,
    suspensionReason: true,
    createdAt: true,
    updatedAt: true
};

const updateUserService = async (id, data) => {
    const allowed = {};
    if (data.name !== undefined) allowed.name = data.name;
    if (data.email !== undefined) allowed.email = data.email;
    if (data.password !== undefined) {
        if (data.password.length < 8) throw new Error('La contraseña debe tener al menos 8 caracteres.');
        allowed.password = await bcrypt.hash(data.password, SALT_ROUNDS);
    }

    const updated = await prisma.user.update({
        where: { id: Number(id) },
        data: allowed,
        select: publicSelect
    });
    return updated;
};
/**
 * Cambia la contraseña del usuario autenticado.
 * Verifica la contraseña actual antes de actualizar.
 * Invalida todos los tokens de reset activos del usuario.
 */
const changePasswordService = async (userId, currentPassword, newPassword) => {
    const user = await prisma.user.findUnique({ where: { id: Number(userId) } });
    if (!user) {
        const err = new Error('Usuario no encontrado.');
        err.status = 404;
        throw err;
    }

    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
        const err = new Error('La contraseña actual es incorrecta.');
        err.status = 400;
        err.code = 'WRONG_CURRENT_PASSWORD';
        throw err;
    }

    if (currentPassword === newPassword) {
        const err = new Error('La nueva contraseña debe ser diferente a la actual.');
        err.status = 400;
        err.code = 'SAME_PASSWORD';
        throw err;
    }

    const hashed = await bcrypt.hash(newPassword, SALT_ROUNDS);

    await prisma.$transaction([
        prisma.user.update({
            where: { id: Number(userId) },
            data: { password: hashed },
        }),
        // Invalidar tokens de reset activos (seguridad)
        prisma.passwordResetToken.deleteMany({
            where: { userId: Number(userId), usedAt: null },
        }),
    ]);
};

module.exports = { updateUserService, changePasswordService };