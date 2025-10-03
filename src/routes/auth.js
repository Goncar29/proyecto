const { Router } = require('express');
const { register, login } = require('../controllers/authController');
const validate = require('../middlewares/validate');
const authenticateToken = require('../middlewares/auth');

const router = Router();

router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);

router.get('/protected-route', authenticateToken, (req, res) => {
    res.send('Esta es una ruta protegida, acceso permitido para el usuario autenticado.');
});

module.exports = router;