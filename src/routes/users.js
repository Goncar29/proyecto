const { Router } = require('express');
const { updateUser } = require('../controllers/userController');
const reservationsRouter = require('./reservations');
const appointmentsRouter = require('./appointments');
const { authenticateToken } = require('../middlewares/auth');
const auditMiddleware = require('../middlewares/auditMiddleware');

const router = Router();

router.put(
    '/:id',
    authenticateToken,
    auditMiddleware('Actualizar usuario'),
    updateUser
);

router.use('/:id/appointments', authenticateToken, appointmentsRouter);
router.use('/:id/reservations', authenticateToken, reservationsRouter);

module.exports = router;
