const prisma = require('../utils/prismaClient');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { logAudit } = require('./audit');
const { SALT_ROUNDS, JWT_SECRET, JWT_EXPIRES_IN } = require('../config');

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

    const token = jwt.sign(
        { id: user.id, role: user.role.toLowerCase() },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
    );
    await logAudit(user.id, 'login');
    return token;
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
    getCurrentUser,
};