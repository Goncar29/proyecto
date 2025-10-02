const reservationService = require('../services/reservationService');

exports.createReservation = async (req, res) => {
    try {
        const { doctorId, patientId, timeBlockId, reason, notes } = req.body;

        const reservation = await reservationService.createReservation(
            { doctorId, patientId, timeBlockId, reason, notes },
            patientId
        );

        res.status(201).json(reservation);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

exports.getReservations = async (req, res) => {
    try {
        const { id } = req.params;
        const reservation = await reservationService.getReservation(id);

        if (!reservation) {
            return res.status(404).json({ error: 'Reserva no encontrada' });
        }

        res.json(reservation);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.updateReservation = async (req, res) => {
    try {
        const { id } = req.params;
        const { doctorId, patientId, timeBlockId, reason, notes } = req.body;

        const updated = await reservationService.updateReservation(id, {
            doctorId,
            patientId,
            timeBlockId,
            reason,
            notes
        });

        res.json(updated);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

exports.deleteReservation = async (req, res) => {
    try {
        const { id } = req.params;
        await reservationService.deleteReservation(id);
        res.status(204).send();
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};
