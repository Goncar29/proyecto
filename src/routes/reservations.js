const { Router } = require('express');
const reservationController = require('../controllers/reservationController');
const { authenticateToken, authorizeRole } = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const { createReservationSchema, updateReservationSchema } = require('../schemas/reservationSchema');
const auditMiddleware = require('../middlewares/auditMiddleware');

const router = Router();

router.post(
    '/',
    authenticateToken,
    authorizeRole('patient'),
    validate(createReservationSchema),
    auditMiddleware('Crear reserva'),
    reservationController.createReservation
);

router.get(
    '/',
    authenticateToken,
    authorizeRole('patient', 'doctor', 'admin'),
    auditMiddleware('Listar reservas'),
    reservationController.getReservations
);

router.put(
    '/:reservationId',
    authenticateToken,
    authorizeRole('patient', 'doctor', 'admin'),
    validate(updateReservationSchema),
    auditMiddleware('Actualizar reserva'),
    reservationController.updateReservation
);

router.delete(
    '/:reservationId',
    authenticateToken,
    authorizeRole('admin'),
    auditMiddleware('Eliminar reserva'),
    reservationController.deleteReservation
);

module.exports = router;

