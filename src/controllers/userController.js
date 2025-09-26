const { updateUserService } = require('../services/userService');
const { validateEmail, validateName, validatePassword } = require('../utils/validations');

const updateUser = async (req, res) => {
    // Autenticación
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });

    const { id } = req.params;
    // Validar id numérico
    if (!id || isNaN(Number(id))) return res.status(400).json({ error: 'Invalid user id' });

    // Permitir solo que el usuario modifique su propio perfil
    if (Number(req.user.id) !== Number(id)) {
        return res.status(403).json({ error: 'Access denied' });
    }

    const payload = req.body || {};
    // Filtrar campos permitidos
    const allowed = {};
    if (payload.name !== undefined) allowed.name = String(payload.name).trim();
    if (payload.email !== undefined) allowed.email = String(payload.email).trim().toLowerCase();
    if (payload.password !== undefined) allowed.password = payload.password;

    if (Object.keys(allowed).length === 0) {
        return res.status(400).json({ error: 'Nothing to update' });
    }

    // Validaciones por campo
    if (allowed.email !== undefined && !validateEmail(allowed.email)) {
        return res.status(400).json({ error: 'Invalid email format' });
    }
    if (allowed.name !== undefined && !validateName(allowed.name)) {
        return res.status(400).json({ error: 'Invalid name' });
    }
    if (allowed.password !== undefined) {
        if (!validatePassword || typeof allowed.password !== 'string' || allowed.password.length < 8) {
            // Si existe validatePassword en utils lo usará; si no, aplica mínima longitud
            return res.status(400).json({ error: 'Password must be at least 8 characters' });
        }
    }

    try {
        // Asegurarse que el servicio hashée la contraseña si llega como texto
        const updated = await updateUserService(id, allowed);
        return res.json(updated);
    } catch (err) {
        // Manejo de errores esperados: conflicto de email, validaciones del servicio, etc.
        const status = err.status || (err.message && err.message.toLowerCase().includes('email') ? 409 : 400);
        return res.status(status).json({ error: err.message || 'Error updating user' });
    }
};

module.exports = { updateUser };