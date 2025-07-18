const { Router } = require('express');
const router = Router();
const authRouter = require('./auth');

router.get('/auth', authRouter);

module.exports = router;