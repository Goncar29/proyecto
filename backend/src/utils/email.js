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

module.exports = { sendPasswordResetEmail };
