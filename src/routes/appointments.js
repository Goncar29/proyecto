const { Router } = require('express');
const appointmentController = require('../controllers/appointmentController');
const { authenticateToken, authorizeRole } = require('../middlewares/auth');
const auditMiddleware = require('../middlewares/auditMiddleware');
const validate = require('../middlewares/validate');
const { createAppointmentSchema } = require('../schemas/appointmentSchema');

const router = Router();

router.get(
    '/',
    authenticateToken,
    authorizeRole(['patient', 'doctor', 'admin']),
    auditMiddleware('Listar citas'),
    appointmentController.getUserAppointments
);

router.post(
    '/',
    authenticateToken,
    authorizeRole(['patient', 'doctor', 'admin']),
    validate(createAppointmentSchema),
    auditMiddleware('Crear cita'),
    appointmentController.createAppointment
);

router.put(
    '/:id',
    authenticateToken,
    authorizeRole(['doctor', 'admin']),
    auditMiddleware('Actualizar cita'),
    appointmentController.updateAppointment
);

router.delete(
    '/:id',
    authenticateToken,
    authorizeRole(['admin']),
    auditMiddleware('Eliminar cita'),
    appointmentController.deleteAppointment
);

module.exports = router;