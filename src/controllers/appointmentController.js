const appointmentService = require('../services/appointmentService');

exports.getUserAppointments = async (req, res) => {
    try {
        const userId = req.params.id;
        const appointments = await appointmentService.getUserAppointments(userId);
        return res.status(200).json(appointments);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener las citas del usuario' });
    }
};