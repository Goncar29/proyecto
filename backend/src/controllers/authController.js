const { registerUser, loginUser, getCurrentUser, refreshAccessToken, logoutUser } = require('../services/authService');
const passwordResetService = require('../services/passwordResetService');
const { REFRESH_COOKIE_NAME, REFRESH_TOKEN_MAX_AGE_MS } = require('../config');

const GENERIC_FORGOT_MESSAGE = 'Si el email existe, te enviamos un link de recuperación.';

/** Cookie options — httpOnly keeps it out of JS; Secure in prod */
const refreshCookieOptions = () => ({
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    maxAge: REFRESH_TOKEN_MAX_AGE_MS,
    path: '/api/auth',  // only sent to auth endpoints
});

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
        const { accessToken, refreshTokenPlain } = await loginUser(email, password);
        res.cookie(REFRESH_COOKIE_NAME, refreshTokenPlain, refreshCookieOptions());
        return res.json({ message: 'Inicio de sesión exitoso', token: accessToken });
    } catch (error) {
        return res.status(401).json({ error: error.message || 'Usuario y/o contraseña incorrecta' });
    }
};

/**
 * POST /auth/refresh
 * Reads refresh token from httpOnly cookie, returns new access token + rotates cookie.
 */
const refresh = async (req, res) => {
    try {
        const refreshTokenPlain = req.cookies?.[REFRESH_COOKIE_NAME];
        const { accessToken, refreshTokenPlain: newRefresh } = await refreshAccessToken(refreshTokenPlain);
        res.cookie(REFRESH_COOKIE_NAME, newRefresh, refreshCookieOptions());
        return res.json({ token: accessToken });
    } catch (error) {
        // Clear the invalid cookie
        res.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/auth' });
        return res.status(401).json({ error: error.message || 'Sesión expirada', code: error.code || 'UNAUTHORIZED' });
    }
};

/**
 * POST /auth/logout
 * Revokes the refresh token and clears the cookie.
 */
const logout = async (req, res, next) => {
    try {
        const refreshTokenPlain = req.cookies?.[REFRESH_COOKIE_NAME];
        await logoutUser(refreshTokenPlain);
        res.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/auth' });
        return res.json({ message: 'Sesión cerrada' });
    } catch (error) {
        return next(error);
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
    refresh,
    logout,
    me,
    forgotPassword,
    resetPassword,
};
