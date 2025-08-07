const { Router } = require('express');
const { createTimeBlock, listReservations, getUsers, getUserId } = require('../controllers/adminController');
const authenticateToken = require('../middlewares/auth');

const router = Router();

router.post('/time-blocks', authenticateToken, createTimeBlock);
router.get('/reservations', authenticateToken, listReservations);
router.get('/users', authenticateToken, getUsers);
router.get('/users/:id', authenticateToken, getUserId);

module.exports = router;