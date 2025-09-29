const { Router } = require('express');
const authenticateToken = require('../middlewares/auth');
const { updateUser } = require('../controllers/userController');
const reservationsRouter = require('./reservations');
const appointmentsRouter = require('./appointments');

const router = Router();

router.put('/:id', authenticateToken, updateUser);


router.use('/:id/appointments', authenticateToken, appointmentsRouter);
router.use('/:id/reservations', authenticateToken, reservationsRouter);

module.exports = router;