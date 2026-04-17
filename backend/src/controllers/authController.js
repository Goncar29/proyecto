const { registerUser, loginUser, getCurrentUser } = require('../services/authService');
const passwordResetService = require('../services/passwordResetService');

const GENERIC_FORGOT_MESSAGE = 'Si el email existe, te enviamos un link de recuperación.';

const register = async (req, res) => {
    try {
        const { email, password, name } = req.body;
        await registerUser(email, password, name);
        return res.status(201).json({ message: 'Usuario registrado con éxito' });
    } catch (error) {
        return res.status(400).json({ error: error.message || 'Error al registrar el usuario' });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const token = await loginUser(email, password);
        return res.json({ message: 'Inicio de sesión exitoso', token });
    } catch (error) {
        return res.status(401).json({ error: error.message || 'Usuario y/o contraseña incorrecta' });
    }
};

const me = async (req, res, next) => {
    try {
        const user = await getCurrentUser(req.user.id);
        return res.status(200).json(user);
    } catch (error) {
        return next(error);
    }
};

const forgotPassword = async (req, res, next) => {
    try {
        const { email } = req.body;
        await passwordResetService.requestPasswordReset(email);
        return res.status(200).json({ message: GENERIC_FORGOT_MESSAGE });
    } catch (error) {
        // Nunca revelamos al usuario si algo falló internamente.
        require('../utils/logger').error({ err: error }, 'forgotPassword failed');
        return res.status(200).json({ message: GENERIC_FORGOT_MESSAGE });
    }
};

const resetPassword = async (req, res, next) => {
    try {
        const { token, newPassword } = req.body;
        await passwordResetService.resetPassword(token, newPassword);
        return res.status(200).json({ message: 'Contraseña actualizada con éxito.' });
    } catch (error) {
        return next(error);
    }
};

module.exports = {
    register,
    login,
    me,
    forgotPassword,
    resetPassword,
};