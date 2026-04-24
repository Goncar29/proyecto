const { Router } = require('express');
const { createTimeBlock, bulkCreateTimeBlocksHandler, listReservations, getUsers, getUserId, updateUserId, deleteUserId, toggleUserStatus, promoteToDoctor } = require('../controllers/adminController');
const { getAuditLogsController } = require('../controllers/auditController');
const { authenticateToken, authorizeRole } = require('../middlewares/auth');
const auditMiddleware = require('../middlewares/auditMiddleware');
const validate = require('../middlewares/validate');
const { auditQuerySchema } = require('../schemas/auditSchema');
const { promoteDoctorSchema } = require('../schemas/promoteDoctorSchema');
const { adminUpdateUserSchema } = require('../schemas/usersSchema');
const { bulkCreateTimeBlockSchema } = require('../schemas/timeBlockSchemas');

const router = Router();

router.use(authenticateToken, authorizeRole(['admin']));

router.post('/time-blocks', auditMiddleware('Admin crear bloque de tiempo'), createTimeBlock);
router.post('/time-blocks/bulk', validate(bulkCreateTimeBlockSchema), auditMiddleware('Admin crear bloques masivos'), bulkCreateTimeBlocksHandler);
router.get('/reservations', auditMiddleware('Admin listar reservas'), listReservations);

router.get('/users', auditMiddleware('Admin listar usuarios'), getUsers);
router.get('/users/:id', auditMiddleware('Admin obtener usuario'), getUserId);
router.put('/users/:id', validate(adminUpdateUserSchema), auditMiddleware('Admin actualizar usuario'), updateUserId);
router.delete('/users/:id', auditMiddleware('Admin eliminar usuario'), deleteUserId);
router.patch('/users/:id/status', auditMiddleware('Admin cambiar estado usuario'), toggleUserStatus);
router.post('/users/:id/promote-to-doctor', validate(promoteDoctorSchema), auditMiddleware('Admin promover a doctor'), promoteToDoctor);

router.get('/audit', validate(auditQuerySchema, { source: 'query' }), getAuditLogsController);

module.exports = router;

