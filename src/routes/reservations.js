const { Router } = require('express');
const reservationController = require('../controllers/reservationController');
const authenticateToken = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const { createReservationSchema, updateReservationSchema } = require('../schemas/reservationSchema');
const auditMiddleware = require('../middlewares/auditMiddleware');

const router = Router();

router.post(
    '/',
    authenticateToken,
    validate(createReservationSchema),
    auditMiddleware('Crear reserva'),
    reservationController.createReservation
);

router.get(
    '/',
    authenticateToken,
    auditMiddleware('Listar reservas'),
    reservationController.getReservations
);

router.put(
    '/:reservationId',
    authenticateToken,
    validate(updateReservationSchema),
    auditMiddleware('Actualizar reserva'),
    reservationController.updateReservation
);

router.delete(
    '/:reservationId',
    authenticateToken,
    auditMiddleware('Eliminar reserva'),
    reservationController.deleteReservation
);

module.exports = router;

