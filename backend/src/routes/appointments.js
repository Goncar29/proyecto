const { Router } = require('express');
const appointmentController = require('../controllers/appointmentController');
const { authenticateToken, authorizeRole } = require('../middlewares/auth');
const auditMiddleware = require('../middlewares/auditMiddleware');
const validate = require('../middlewares/validate');
const {
    createAppointmentSchema,
    listAppointmentsQuerySchema,
    cancelAppointmentSchema,
} = require('../schemas/appointmentSchema');

// mergeParams: inherit :id from parent /api/users/:id/appointments mount.
const router = Router({ mergeParams: true });

router.get(
    '/',
    authenticateToken,
    authorizeRole(['patient', 'doctor', 'admin']),
    validate(listAppointmentsQuerySchema, { source: 'query' }),
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

router.patch(
    '/:id/cancel',
    authenticateToken,
    authorizeRole(['patient', 'doctor', 'admin']),
    validate(cancelAppointmentSchema),
    auditMiddleware('Cancelar cita'),
    appointmentController.cancelAppointment,
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