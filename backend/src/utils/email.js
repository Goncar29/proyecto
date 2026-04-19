const { Resend } = require('resend');
const logger = require('./logger');

let resendClient = null;

const getClient = () => {
    if (!process.env.RESEND_API_KEY) {
        throw new Error('RESEND_API_KEY no está configurado en el entorno.');
    }
    if (!resendClient) {
        resendClient = new Resend(process.env.RESEND_API_KEY);
    }
    return resendClient;
};

/**
 * Envía el email de recuperación de contraseña.
 * Si falla, logea pero NO tira el error al caller — así el endpoint siempre
 * responde 200 (enumeration prevention) incluso si Resend está caído.
 */
const sendPasswordResetEmail = async (to, resetUrl) => {
    const from = process.env.EMAIL_FROM || 'onboarding@resend.dev';
    const subject = 'Recuperá tu contraseña — MediConnect';

    const html = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
            <h2 style="color: #2563eb;">Recuperá tu contraseña</h2>
            <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta en MediConnect.</p>
            <p>Hacé click en el siguiente botón para elegir una nueva contraseña. El link expira en <strong>30 minutos</strong>.</p>
            <p style="margin: 32px 0;">
                <a href="${resetUrl}" style="background: #2563eb; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">
                    Cambiar contraseña
                </a>
            </p>
            <p style="color: #6b7280; font-size: 14px;">Si no pediste este cambio, ignorá este email y tu contraseña seguirá siendo la misma.</p>
            <p style="color: #6b7280; font-size: 14px;">O copiá este enlace en tu navegador:<br><span style="word-break: break-all;">${resetUrl}</span></p>
        </div>
    `;

    const text = `Recuperá tu contraseña\n\nAbrí este enlace para elegir una nueva contraseña (expira en 30 minutos):\n\n${resetUrl}\n\nSi no pediste este cambio, ignorá este email.`;

    try {
        const client = getClient();
        await client.emails.send({ from, to, subject, html, text });
        return true;
    } catch (err) {
        logger.error({ err }, 'Password reset email failed to send');
        return false;
    }
};

/**
 * Formatea una fecha/hora para los emails de turnos.
 * Ejemplo: "martes 22 de abril de 2026 a las 10:30 hs"
 */
const formatAppointmentDate = (date) => {
    const d = new Date(date);
    return d.toLocaleString('es-AR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'America/Argentina/Buenos_Aires',
    }) + ' hs';
};

/**
 * Notifica al paciente que su turno fue CONFIRMADO por el doctor.
 */
const sendAppointmentConfirmedEmail = async ({ patientEmail, patientName, doctorName, startTime }) => {
    const from = process.env.EMAIL_FROM || 'onboarding@resend.dev';
    const subject = 'Tu turno fue confirmado — MediConnect';
    const dateStr = formatAppointmentDate(startTime);

    const html = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
            <h2 style="color: #16a34a;">✓ Tu turno fue confirmado</h2>
            <p>Hola <strong>${patientName}</strong>,</p>
            <p>El Dr./Dra. <strong>${doctorName}</strong> confirmó tu turno.</p>
            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 20px 0;">
                <p style="margin: 0; font-size: 16px;"><strong>📅 ${dateStr}</strong></p>
            </div>
            <p style="color: #6b7280; font-size: 14px;">Podés ver todos tus turnos en tu <a href="${process.env.APP_URL || 'http://localhost:5173'}/dashboard" style="color: #2563eb;">dashboard</a>.</p>
        </div>
    `;
    const text = `Hola ${patientName},\n\nEl Dr./Dra. ${doctorName} confirmó tu turno para el ${dateStr}.\n\nVisitá tu dashboard para más detalles.`;

    try {
        const client = getClient();
        await client.emails.send({ from, to: patientEmail, subject, html, text });
        return true;
    } catch (err) {
        logger.error({ err }, 'Appointment confirmed email failed to send');
        return false;
    }
};

/**
 * Notifica que un turno fue CANCELADO.
 * - Si cancela el doctor → avisa al paciente
 * - Si cancela el paciente → avisa al doctor
 */
const sendAppointmentCancelledEmail = async ({ toEmail, toName, otherPartyName, startTime, cancelledBy, reason }) => {
    const from = process.env.EMAIL_FROM || 'onboarding@resend.dev';
    const subject = 'Tu turno fue cancelado — MediConnect';
    const dateStr = formatAppointmentDate(startTime);
    const whoLabel = cancelledBy === 'doctor' ? `el Dr./Dra. ${otherPartyName}` : `el paciente ${otherPartyName}`;

    const html = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
            <h2 style="color: #dc2626;">✕ Turno cancelado</h2>
            <p>Hola <strong>${toName}</strong>,</p>
            <p>El turno del <strong>${dateStr}</strong> fue cancelado por ${whoLabel}.</p>
            ${reason ? `<p style="color: #6b7280; font-size: 14px;"><strong>Motivo:</strong> ${reason}</p>` : ''}
            <p style="color: #6b7280; font-size: 14px;">Podés reservar un nuevo turno desde <a href="${process.env.APP_URL || 'http://localhost:5173'}/doctors" style="color: #2563eb;">nuestra plataforma</a>.</p>
        </div>
    `;
    const text = `Hola ${toName},\n\nEl turno del ${dateStr} fue cancelado por ${whoLabel}.${reason ? `\nMotivo: ${reason}` : ''}\n\nPodés reservar un nuevo turno en MediConnect.`;

    try {
        const client = getClient();
        await client.emails.send({ from, to: toEmail, subject, html, text });
        return true;
    } catch (err) {
        logger.error({ err }, 'Appointment cancelled email failed to send');
        return false;
    }
};

/**
 * Recuerda al paciente que tiene un turno en ~24 hs.
 * Se llama desde el cron job — no bloquea el caller.
 */
const sendAppointmentReminderEmail = async ({ patientEmail, patientName, doctorName, startTime }) => {
    const from = process.env.EMAIL_FROM || 'onboarding@resend.dev';
    const subject = 'Recordatorio de turno mañana — MediConnect';
    const dateStr = formatAppointmentDate(startTime);

    const html = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
            <h2 style="color: #2563eb;">⏰ Recordatorio de turno</h2>
            <p>Hola <strong>${patientName}</strong>,</p>
            <p>Te recordamos que tenés un turno mañana con el Dr./Dra. <strong>${doctorName}</strong>.</p>
            <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 16px; margin: 20px 0;">
                <p style="margin: 0; font-size: 16px;"><strong>📅 ${dateStr}</strong></p>
            </div>
            <p style="color: #6b7280; font-size: 14px;">Si no podés asistir, cancelá tu turno desde tu <a href="${process.env.APP_URL || 'http://localhost:5173'}/dashboard" style="color: #2563eb;">dashboard</a> para liberar el horario.</p>
        </div>
    `;
    const text = `Hola ${patientName},\n\nRecordatorio: tenés un turno mañana con el Dr./Dra. ${doctorName} el ${dateStr}.\n\nSi no podés asistir, cancelalo desde tu dashboard.`;

    try {
        const client = getClient();
        await client.emails.send({ from, to: patientEmail, subject, html, text });
        return true;
    } catch (err) {
        logger.error({ err }, 'Appointment reminder email failed to send');
        return false;
    }
};

module.exports = {
    sendPasswordResetEmail,
    sendAppointmentConfirmedEmail,
    sendAppointmentCancelledEmail,
    sendAppointmentReminderEmail,
};
