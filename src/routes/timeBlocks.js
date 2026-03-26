const express = require('express');
const router = express.Router();
const timeBlockController = require('../controllers/timeBlockController');
const { createTimeBlockSchema, updateTimeBlockSchema } = require('../schemas/timeBlockSchemas');
const validate = require('../middlewares/validate');
const { authenticateToken, authorizeRole } = require('../middlewares/auth');
const auditMiddleware = require('../middlewares/auditMiddleware');

router.post(
    '/',
    authenticateToken,
    authorizeRole(['doctor', 'admin']),
    validate(createTimeBlockSchema, { context: { role: (req) => req.user.role } }),
    auditMiddleware('Crear bloque de tiempo'),
    (req, res, next) => {
        if (req.user.role === 'doctor') {
            req.body.doctorId = req.user.id;
        }
        return timeBlockController.createTimeBlock(req, res, next);
    }
);

router.get(
    '/',
    authenticateToken,
    authorizeRole(['patient', 'doctor', 'admin']),
    auditMiddleware('Listar bloques de tiempo'),
    timeBlockController.getTimeBlocks
);

router.get(
    '/:id',
    authenticateToken,
    authorizeRole(['patient', 'doctor', 'admin']),
    auditMiddleware('Obtener bloque de tiempo'),
    timeBlockController.getTimeBlockById
);

router.put(
    '/:id',
    authenticateToken,
    authorizeRole(['doctor', 'admin']),
    validate(updateTimeBlockSchema, { context: { role: (req) => req.user.role } }),
    auditMiddleware('Actualizar bloque de tiempo'),
    (req, res, next) => {
        if (req.user.role === 'doctor') {
            req.body.doctorId = req.user.id;
        }
        return timeBlockController.updateTimeBlock(req, res, next);
    }
);

router.delete(
    '/:id',
    authenticateToken,
    authorizeRole(['doctor', 'admin']),
    auditMiddleware('Eliminar bloque de tiempo'),
    timeBlockController.deleteTimeBlock
);

module.exports = router;

