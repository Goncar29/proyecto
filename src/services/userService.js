const prisma = require('../utils/prismaClient');
const bcrypt = require('bcryptjs');

const SALT_ROUNDS = Number(process.env.SALT_ROUNDS) || 10;

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
    if (data.role !== undefined) allowed.role = data.role;
    if (data.isActive !== undefined) allowed.isActive = data.isActive;
    if (data.isSuspended !== undefined) allowed.isSuspended = data.isSuspended;
    if (data.suspensionReason !== undefined) allowed.suspensionReason = data.suspensionReason;
    if (data.password !== undefined) {
        if (data.password.length < 8) throw new Error('Password must be at least 8 characters');
        allowed.password = await bcrypt.hash(data.password, SALT_ROUNDS);
    }

    const updated = await prisma.user.update({
        where: { id: Number(id) },
        data: allowed,
        select: publicSelect
    });
    return updated;
};
module.exports = { updateUserService };