const { Router } = require('express');
const authRouter = require('./auth');
const adminRouter = require('./admin');
const usersRouter = require('./users');
const router = Router();

router.use('/auth', authRouter);
router.use('/admin', adminRouter);
router.use('/users', usersRouter);

module.exports = router;