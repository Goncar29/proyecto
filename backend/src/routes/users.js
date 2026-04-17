const { Router } = require('express');
const { updateUser, changePassword } = require('../controllers/userController');
const reservationsRouter = require('./reservations');
const appointmentsRouter = require('./appointments');
const { authenticateToken } = require('../middlewares/auth');
const auditMiddleware = require('../middlewares/auditMiddleware');
const validate = require('../middlewares/validate');
const { updateUserSchema, changePasswordSchema } = require('../schemas/usersSchema');

const router = Router();

router.put(
    '/:id',
    authenticateToken,
    validate(updateUserSchema),
    auditMiddleware('Actualizar usuario'),
    updateUser
);

router.patch(
    '/me/password',
    authenticateToken,
    validate(changePasswordSchema),
    auditMiddleware('Cambiar contraseña'),
    changePassword
);

router.use('/:id/appointments', authenticateToken, appointmentsRouter);
router.use('/:id/reservations', authenticateToken, reservationsRouter);

module.exports = router;
