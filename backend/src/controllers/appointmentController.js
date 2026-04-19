const appointmentService = require('../services/appointmentService');
const { sendAppointmentConfirmedEmail, sendAppointmentCancelledEmail } = require('../utils/email');

exports.getUserAppointments = async (req, res, next) => {
    try {
        // When mounted under /api/users/:id/appointments, req.params.id is the
        // target user. When mounted at /api/appointments, it's undefined and we
        // default to the caller. Non-admins may only read their own.
        const targetId = req.params.id ? parseInt(req.params.id, 10) : req.user.id;
        const callerRole = req.user.role?.toLowerCase();
        if (targetId !== req.user.id && callerRole !== 'admin') {
            const err = new Error('Forbidden');
            err.status = 403;
            err.code = 'FORBIDDEN';
            throw err;
        }
        const result = await appointmentService.getUserAppointments(targetId, req.query);
        return res.status(200).json(result);
    } catch (error) {
        return next(error);
    }
};

exports.createAppointment = async (req, res, next) => {
    try {
        const appointmentData = {
            ...req.body,
            patientId: req.user.id
        };
        const appointment = await appointmentService.createAppointment(appointmentData);
        return res.status(201).json(appointment);
    } catch (error) {
        return next(error);
    }
};

exports.cancelAppointment = async (req, res, next) => {
    try {
        const appt = await appointmentService.cancelAppointment(
            req.params.id,
            req.user,
            req.body?.reason,
        );

        // Notificar a la otra parte (fire-and-forget — no bloquea la respuesta)
        const callerRole = req.user.role?.toLowerCase();
        const cancelledBy = callerRole === 'patient' ? 'patient' : 'doctor';
        if (cancelledBy === 'doctor') {
            // Doctor cancela → avisa al paciente
            sendAppointmentCancelledEmail({
                toEmail: appt.patient.email,
                toName: appt.patient.name,
                otherPartyName: appt.doctor.name,
                startTime: appt.timeBlock.startTime,
                cancelledBy: 'doctor',
                reason: appt.reason,
            }).catch(() => {});
        } else if (cancelledBy === 'patient') {
            // Paciente cancela → avisa al doctor
            sendAppointmentCancelledEmail({
                toEmail: appt.doctor.email,
                toName: appt.doctor.name,
                otherPartyName: appt.patient.name,
                startTime: appt.timeBlock.startTime,
                cancelledBy: 'patient',
                reason: appt.reason,
            }).catch(() => {});
        }

        return res.status(200).json(appt);
    } catch (error) {
        return next(error);
    }
};

exports.confirmAppointment = async (req, res, next) => {
    try {
        const appt = await appointmentService.confirmAppointment(
            req.params.id,
            req.user,
            req.body?.notes,
        );

        // Notificar al paciente (fire-and-forget)
        sendAppointmentConfirmedEmail({
            patientEmail: appt.patient.email,
            patientName:  appt.patient.name,
            doctorName:   appt.doctor.name,
            startTime:    appt.timeBlock.startTime,
        }).catch(() => {});

        return res.status(200).json(appt);
    } catch (error) {
        return next(error);
    }
};

exports.completeAppointment = async (req, res, next) => {
    try {
        const appt = await appointmentService.completeAppointment(
            req.params.id,
            req.user,
            req.body?.notes,
        );
        return res.status(200).json(appt);
    } catch (error) {
        return next(error);
    }
};

exports.updateAppointment = async (req, res, next) => {
    try {
        const { id } = req.params;
        const appointment = await appointmentService.updateAppointment(id, req.body);
        return res.status(200).json(appointment);
    } catch (error) {
        return next(error);
    }
};

exports.rescheduleAppointment = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { timeBlockId } = req.body;
        const appointment = await appointmentService.rescheduleAppointment(id, req.user, timeBlockId);
        return res.status(200).json(appointment);
    } catch (error) {
        return next(error);
    }
};

exports.deleteAppointment = async (req, res, next) => {
    try {
        const { id } = req.params;
        await appointmentService.deleteAppointment(id);
        return res.status(204).send();
    } catch (error) {
        return next(error);
    }
};