const { Router } = require('express');
const { register, login } = require('../controllers/authController');
const { authenticateToken } = require('../middlewares/auth');
const rateLimit = require('express-rate-limit');
const validate = require('../middlewares/validate');
const { registerSchema, loginSchema } = require('../schemas/usersSchema');

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20,
    message: { error: 'Too many requests, please try again later' }
});

const router = Router();

router.post('/register', authLimiter, validate(registerSchema), register);
router.post('/login', authLimiter, validate(loginSchema), login);

module.exports = router;