const { Router } = require('express');
const { createTimeBlock, listReservations, getUsers, getUserId, updateUserId, toggleUserStatus } = require('../controllers/adminController');
const { getAuditLogsController } = require('../controllers/auditController');
const authenticateToken = require('../middlewares/auth');
const auditMiddleware = require('../middlewares/auditMiddleware');

const router = Router();

router.post('/time-blocks', authenticateToken, auditMiddleware('Admin crear bloque de tiempo'), createTimeBlock);
router.get('/reservations', authenticateToken, auditMiddleware('Admin listar reservas'), listReservations);

router.get('/users', authenticateToken, auditMiddleware('Admin listar usuarios'), getUsers);
router.get('/users/:id', authenticateToken, auditMiddleware('Admin obtener usuario'), getUserId);
router.put('/users/:id', authenticateToken, auditMiddleware('Admin actualizar usuario'), updateUserId);
router.patch('/users/:id/status', authenticateToken, auditMiddleware('Admin cambiar estado usuario'), toggleUserStatus);

router.get('/audit', authenticateToken, auditMiddleware('Admin listar auditoría'), getAuditLogsController);

module.exports = router;

