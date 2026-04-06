const { Router } = require('express');
const { createTimeBlock, listReservations, getUsers, getUserId, updateUserId, toggleUserStatus } = require('../controllers/adminController');
const { getAuditLogsController } = require('../controllers/auditController');
const { authenticateToken, authorizeRole } = require('../middlewares/auth');
const auditMiddleware = require('../middlewares/auditMiddleware');
const validate = require('../middlewares/validate');
const { auditQuerySchema } = require('../schemas/auditSchema');

const router = Router();

router.use(authenticateToken, authorizeRole(['admin']));

router.post('/time-blocks', auditMiddleware('Admin crear bloque de tiempo'), createTimeBlock);
router.get('/reservations', auditMiddleware('Admin listar reservas'), listReservations);

router.get('/users', auditMiddleware('Admin listar usuarios'), getUsers);
router.get('/users/:id', auditMiddleware('Admin obtener usuario'), getUserId);
router.put('/users/:id', auditMiddleware('Admin actualizar usuario'), updateUserId);
router.patch('/users/:id/status', auditMiddleware('Admin cambiar estado usuario'), toggleUserStatus);

router.get('/audit', validate(auditQuerySchema, { source: 'query' }), auditMiddleware('Admin listar auditoría'), getAuditLogsController);

module.exports = router;

