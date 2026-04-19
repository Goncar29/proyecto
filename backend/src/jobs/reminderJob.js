/**
 * Reminder job — envía emails de recordatorio 24h antes de cada turno.
 *
 * Estrategia:
 *  - Cron cada 10 minutos: busca turnos CONFIRMED cuyo startTime cae en
 *    la ventana [now + 24h, now + 24h + 10min] Y cuyo reminderSentAt IS NULL.
 *  - Por cada uno: envía email + setea reminderSentAt = now (idempotente).
 *  - Si el email falla, NO setea reminderSentAt → se reintentará en el próximo tick.
 */

const cron = require('node-cron');
const prisma = require('../utils/prismaClient');
const { sendAppointmentReminderEmail } = require('../utils/email');
const logger = require('../utils/logger');

const WINDOW_MS   = 10 * 60 * 1000;  // 10 minutos — coincide con el intervalo del cron
const AHEAD_MS    = 24 * 60 * 60 * 1000;  // 24 horas

/**
 * Lógica central del job — exportada por separado para poder testearla
 * directamente sin depender del scheduler de node-cron.
 */
async function runReminderCheck() {
    const now      = new Date();
    const windowStart = new Date(now.getTime() + AHEAD_MS);
    const windowEnd   = new Date(now.getTime() + AHEAD_MS + WINDOW_MS);

    const appointments = await prisma.appointment.findMany({
        where: {
            status:         'CONFIRMED',
            reminderSentAt: null,
            timeBlock: {
                startTime: {
                    gte: windowStart,
                    lt:  windowEnd,
                },
            },
        },
        include: {
            patient:   { select: { email: true, name: true } },
            doctor:    { select: { name: true } },
            timeBlock: { select: { startTime: true } },
        },
    });

    if (appointments.length === 0) return;

    logger.info({ count: appointments.length }, 'reminderJob: sending reminders');

    for (const appt of appointments) {
        const sent = await sendAppointmentReminderEmail({
            patientEmail: appt.patient.email,
            patientName:  appt.patient.name,
            doctorName:   appt.doctor.name,
            startTime:    appt.timeBlock.startTime,
        });

        if (sent) {
            await prisma.appointment.update({
                where: { id: appt.id },
                data:  { reminderSentAt: now },
            });
            logger.info({ appointmentId: appt.id }, 'reminderJob: reminder sent');
        } else {
            logger.warn({ appointmentId: appt.id }, 'reminderJob: email failed — will retry next tick');
        }
    }
}

/**
 * Inicia el cron job.
 * Llamar SOLO si NODE_ENV !== 'test'.
 */
function start() {
    // Cada 10 minutos
    cron.schedule('*/10 * * * *', async () => {
        try {
            await runReminderCheck();
        } catch (err) {
            logger.error({ err }, 'reminderJob: unhandled error');
        }
    });

    logger.info('reminderJob: started (every 10 min)');
}

module.exports = { start, runReminderCheck };
