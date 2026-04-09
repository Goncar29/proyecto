const appointmentService = require('../services/appointmentService');

exports.getUserAppointments = async (req, res) => {
    try {
        const userId = req.user.id;
        const appointments = await appointmentService.getUserAppointments(userId);
        return res.status(200).json(appointments);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener las citas del usuario' });
    }
};

exports.createAppointment = async (req, res) => {
    try {
        const appointmentData = {
            ...req.body,
            patientId: req.user.id
        };
        const appointment = await appointmentService.createAppointment(appointmentData);
        return res.status(201).json(appointment);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

exports.updateAppointment = async (req, res) => {
    try {
        const { id } = req.params;
        const appointment = await appointmentService.updateAppointment(id, req.body);
        return res.status(200).json(appointment);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

exports.deleteAppointment = async (req, res) => {
    try {
        const { id } = req.params;
        await appointmentService.deleteAppointment(id);
        return res.status(204).send();
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};