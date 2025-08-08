const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = new PrismaClient();
const { logAudit } = require('./audit');

const registerUser = async (email, password, name) => {
    if (!email || !password || !name) {
        throw new Error('Email, password y nombre son obligatorios.');
    }
    if (password.length < 8) {
        throw new Error('La contraseña debe tener al menos 8 caracteres.');
    }
    const hashedPassword = await bcrypt.hash(password, 10);
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
        console.error('Error al registrar el usuario:', error);
        throw new Error('Error con conexión a la base de datos');
    }
};

const loginUser = async (email, password) => {
    const user = await prisma.user.findUnique({ where: { email } });
    console.log('User from DB:', user);
    const isPasswordValid = user ? await bcrypt.compare(password, user.password) : false;
    if (!user || !isPasswordValid) {
        throw new Error('Usuario y/o contraseña incorrecta');
    }
    const token = jwt.sign(
        { id: user.id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
    );
    await logAudit(user.id, 'login')
    return token;
};

module.exports = {
    registerUser,
    loginUser
};