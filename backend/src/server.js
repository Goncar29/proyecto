const { PORT } = require('./config/env');
const app = require('./app');
const prisma = require('./utils/prismaClient');
const reminderJob = require('./jobs/reminderJob');
const log = require('./utils/logger');

// Captura rechazos de Promise no manejados — sin esto el proceso crashea silenciosamente
// en Node >= 15 o queda en estado zombie en versiones anteriores.
process.on('unhandledRejection', (reason) => {
    log.fatal({ err: reason }, 'Unhandled promise rejection — shutting down');
    process.exit(1);
});

// Captura errores síncronos fuera de cualquier try/catch
process.on('uncaughtException', (err) => {
    log.fatal({ err }, 'Uncaught exception — shutting down');
    process.exit(1);
});

process.on('SIGINT', async () => {
    await prisma.$disconnect();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    await prisma.$disconnect();
    process.exit(0);
});

app.listen(PORT, () => {
    log.info({ port: PORT }, 'Server listening');

    if (process.env.NODE_ENV !== 'test') {
        reminderJob.start();
    }
});