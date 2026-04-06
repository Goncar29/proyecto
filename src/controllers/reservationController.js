const reservationService = require('../services/reservationService');

exports.createReservation = async (req, res) => {
    try {
        const { doctorId, timeBlockId, reason, notes } = req.body;
        const patientId = req.user.id;

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
        const userId = req.user.id;
        const reservations = await reservationService.getUserReservations(userId);
        res.status(200).json(reservations);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.updateReservation = async (req, res) => {
    try {
        const { reservationId } = req.params;
        const { timeBlockId, reason, notes } = req.body;

        const existing = await reservationService.getReservation(reservationId);
        if (!existing) {
            return res.status(404).json({ error: 'Reserva no encontrada' });
        }

        if (req.user.role === 'patient' && existing.patientId !== req.user.id) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const doctorId = existing.doctorId;
        const patientId = existing.patientId;

        const updated = await reservationService.updateReservation(reservationId, {
            doctorId,
            patientId,
            timeBlockId: timeBlockId !== undefined ? timeBlockId : existing.timeBlockId,
            reason,
            notes
        });

        res.status(200).json(updated);
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
