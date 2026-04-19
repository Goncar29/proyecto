const { updateUserService, changePasswordService } = require('../services/userService');
const { logAudit } = require('../services/audit');

const updateUser = async (req, res, next) => {
    const { id } = req.params;

    // Joi ya validó el body; solo validamos el URL param (fuera del scope de Joi)
    if (!id || isNaN(Number(id))) {
        return res.status(400).json({ error: 'El ID de usuario no es válido.' });
    }

    // Autorización: solo el propio usuario puede modificar su perfil
    if (Number(req.user.id) !== Number(id)) {
        return res.status(403).json({ error: 'No tenés permiso para modificar este usuario.' });
    }

    // Sanitizar campos antes de persistir (Joi validó formato, acá normalizamos)
    // Nota: password NO se acepta acá — usar PATCH /me/password (requiere currentPassword)
    const { name, email } = req.body;
    const allowed = {};
    if (name !== undefined)  allowed.name  = String(name).trim();
    if (email !== undefined) allowed.email = String(email).trim().toLowerCase();

    try {
        const updated = await updateUserService(id, allowed);
        return res.status(200).json(updated);
    } catch (err) {
        return next(err);
    }
};

const changePassword = async (req, res, next) => {
    const { currentPassword, newPassword } = req.body;
    try {
        await changePasswordService(req.user.id, currentPassword, newPassword);
        await logAudit(req.user.id, 'password_changed');
        return res.status(200).json({ message: 'Contraseña actualizada con éxito.' });
    } catch (err) {
        return next(err);
    }
};

module.exports = { updateUser, changePassword };