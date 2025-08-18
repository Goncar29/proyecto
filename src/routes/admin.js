const { Router } = require('express');
const { createTimeBlock, listReservations, getUsers, getUserId, updateUserId, deleteUserId } = require('../controllers/adminController');
const authenticateToken = require('../middlewares/auth');
const { listAuditLogs } = require('../controllers/auditController');

const router = Router();

router.post('/time-blocks', authenticateToken, createTimeBlock);
router.get('/reservations', authenticateToken, listReservations);

router.get('/users', authenticateToken, getUsers);
router.get('/users/:id', authenticateToken, getUserId);
router.put('/users/:id', authenticateToken, updateUserId);
router.delete('/users/:id', authenticateToken, deleteUserId);

router.get('/audit', authenticateToken, listAuditLogs);

module.exports = router;