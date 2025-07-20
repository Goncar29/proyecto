const { registerUser, loginUser } = require('../services/authService');

const register = async (req, res) => {
    try {
        const { email, password, name } = req.body;
        await registerUser(email, password, name);
        return res.status(201).json({ message: 'Usuario registrado con éxito' });
    } catch (error) {
        return res.status(400).json({ error: error.message || 'Error al registrar el usuario' });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const token = await loginUser(email, password);
        return res.json({ message: 'Inicio de sesión exitoso', token });
    } catch (error) {
        return res.status(401).json({ error: error.message || 'Usuario y/o contraseña incorrecta' });
    }
};

module.exports = {
    register,
    login
};