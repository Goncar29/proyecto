const appointmentService = require('../services/appointmentService');

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

exports.deleteAppointment = async (req, res, next) => {
    try {
        const { id } = req.params;
        await appointmentService.deleteAppointment(id);
        return res.status(204).send();
    } catch (error) {
        return next(error);
    }
};