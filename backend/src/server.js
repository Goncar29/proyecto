const { PORT } = require('./config/env');
const app = require('./app');
const prisma = require('./utils/prismaClient');
const reminderJob = require('./jobs/reminderJob');

process.on('SIGINT', async () => {
    await prisma.$disconnect();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    await prisma.$disconnect();
    process.exit(0);
});

const log = require('./utils/logger');

app.listen(PORT, () => {
    log.info({ port: PORT }, 'Server listening');

    if (process.env.NODE_ENV !== 'test') {
        reminderJob.start();
    }
});