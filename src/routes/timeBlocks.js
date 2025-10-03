const express = require('express');
const router = express.Router();

const timeBlockController = require('../controllers/timeBlockController');
const { createTimeBlockSchema, updateTimeBlockSchema } = require('../schemas/timeBlockSchemas');
const validate = require('../middlewares/validate');
const { authenticateToken, authorizeRole } = require('../middlewares/auth');

// Crear un time block
router.post(
    '/',
    authenticateToken,
    authorizeRole(['doctor', 'admin']),
    validate(createTimeBlockSchema, {
        context: { role: (req) => req.user.role }, // pasamos rol al schema
    }),
    (req, res, next) => {
        // Si es doctor, el doctorId se fuerza al suyo propio
        if (req.user.role === 'doctor') {
            req.body.doctorId = req.user.id;
        }
        return timeBlockController.createTimeBlock(req, res, next);
    }
);

// Listar time blocks
router.get(
    '/',
    authenticateToken,
    authorizeRole(['doctor', 'admin']),
    timeBlockController.getTimeBlocks
);

// Obtener un time block específico
router.get(
    '/:id',
    authenticateToken,
    authorizeRole(['doctor', 'admin']),
    timeBlockController.getTimeBlockById
);

// Actualizar un time block
router.put(
    '/:id',
    authenticateToken,
    authorizeRole(['doctor', 'admin']),
    validate(updateTimeBlockSchema, {
        context: { role: (req) => req.user.role },
    }),
    (req, res, next) => {
        if (req.user.role === 'doctor') {
            req.body.doctorId = req.user.id;
        }
        return timeBlockController.updateTimeBlock(req, res, next);
    }
);

// Eliminar un time block
router.delete(
    '/:id',
    authenticateToken,
    authorizeRole(['doctor', 'admin']),
    timeBlockController.deleteTimeBlock
);

module.exports = router;
