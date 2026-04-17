const { Router } = require('express');
const { register, login, me, forgotPassword, resetPassword } = require('../controllers/authController');
const { authenticateToken } = require('../middlewares/auth');
const rateLimit = require('express-rate-limit');
const validate = require('../middlewares/validate');
const {
    registerSchema,
    loginSchema,
    forgotPasswordSchema,
    resetPasswordSchema,
} = require('../schemas/usersSchema');

// 20 intentos por 15 min — register, login, reset-password
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later', code: 'RATE_LIMITED' },
});

// 5 intentos por hora — forgot-password (previene spam de emails)
const forgotPasswordLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hora
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Demasiados intentos de recuperación. Esperá 1 hora e intentá de nuevo.', code: 'RATE_LIMITED' },
});

const router = Router();

router.post('/register', authLimiter, validate(registerSchema), register);
router.post('/login', authLimiter, validate(loginSchema), login);
router.get('/me', authenticateToken, me);
router.post('/forgot-password', forgotPasswordLimiter, validate(forgotPasswordSchema), forgotPassword);
router.post('/reset-password', authLimiter, validate(resetPasswordSchema), resetPassword);

module.exports = router;