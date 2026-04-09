const { Router } = require('express');
const authRouter = require('./auth');
const adminRouter = require('./admin');
const usersRouter = require('./users');
const timeBlocksRouter = require('./timeBlocks');
const appointmentsRouter = require('./appointments');
const publicDoctorsRouter = require('./publicDoctors');
const router = Router();

router.use('/auth', authRouter);
router.use('/admin', adminRouter);
router.use('/users', usersRouter);
router.use('/time-blocks', timeBlocksRouter);
router.use('/appointments', appointmentsRouter);
router.use('/public/doctors', publicDoctorsRouter);

module.exports = router;