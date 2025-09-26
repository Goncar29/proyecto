const { Router } = require('express');
const authenticateToken = require('../middlewares/auth');
const { updateUser } = require('../controllers/userController');

const router = Router();

router.put('/:id', authenticateToken, updateUser);

module.exports = router;