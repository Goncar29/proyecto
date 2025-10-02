const { Router } = require('express');
const reservationController = require('../controllers/reservationController');
const authenticateToken = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const { createReservationSchema, updateReservationSchema } = require('../schemas/reservationSchema');

const router = Router();

router.post(
    '/',
    authenticateToken,
    validate(createReservationSchema),
    reservationController.createReservation
);

router.get(
    '/:id',
    authenticateToken,
    reservationController.getReservations
);

router.put(
    '/:id',
    authenticateToken,
    validate(updateReservationSchema),
    reservationController.updateReservation
);

router.delete(
    '/:id',
    authenticateToken,
    reservationController.deleteReservation
);

module.exports = router;
