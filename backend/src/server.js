const { PORT } = require('./config/env');
const app = require('./app');
const prisma = require('./utils/prismaClient');

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
});