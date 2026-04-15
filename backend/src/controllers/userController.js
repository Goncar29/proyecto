const { updateUserService } = require('../services/userService');
const { validateEmail, validateName, validatePassword } = require('../utils/validations');

const updateUser = async (req, res) => {
    // Autenticación
    if (!req.user) return res.status(401).json({ error: 'No autenticado.' });

    const { id } = req.params;
    // Validar id numérico
    if (!id || isNaN(Number(id))) return res.status(400).json({ error: 'El ID de usuario no es válido.' });

    // Permitir solo que el usuario modifique su propio perfil
    if (Number(req.user.id) !== Number(id)) {
        return res.status(403).json({ error: 'No tenés permiso para modificar este usuario.' });
    }

    const payload = req.body || {};
    // Filtrar campos permitidos
    const allowed = {};
    if (payload.name !== undefined) allowed.name = String(payload.name).trim();
    if (payload.email !== undefined) allowed.email = String(payload.email).trim().toLowerCase();
    if (payload.password !== undefined) allowed.password = payload.password;

    if (Object.keys(allowed).length === 0) {
        return res.status(400).json({ error: 'No hay campos para actualizar.' });
    }

    // Validaciones por campo
    if (allowed.email !== undefined && !validateEmail(allowed.email)) {
        return res.status(400).json({ error: 'El formato del email no es válido.' });
    }
    if (allowed.name !== undefined && !validateName(allowed.name)) {
        return res.status(400).json({ error: 'El nombre no es válido.' });
    }
    if (allowed.password !== undefined) {
        if (!validatePassword(allowed.password)) {
            return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres.' });
        }
    }

    try {
        // Asegurarse que el servicio hashée la contraseña si llega como texto
        const updated = await updateUserService(id, allowed);
        return res.status(200).json(updated);
    } catch (err) {
        // Manejo de errores esperados: conflicto de email, validaciones del servicio, etc.
        const status = err.status || (err.message && err.message.toLowerCase().includes('email') ? 409 : 400);
        return res.status(status).json({ error: err.message || 'Error al actualizar el usuario.' });
    }
};

module.exports = { updateUser };