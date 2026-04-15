const prisma = require('../utils/prismaClient');
const { parsePagination, buildPage } = require('./paginate');

/**
 * List appointments for a given user (as patient OR as doctor), with
 * optional filters: status, from/to (TimeBlock.date window), pagination.
 *
 * The same endpoint serves both roles — a doctor hitting it sees their
 * own agenda, a patient sees bookings. We OR over patientId/doctorId so
 * whoever owns the user id gets the right set.
 */
exports.getUserAppointments = async (userId, query = {}) => {
    const { page, pageSize, skip, take } = parsePagination({
        page: query.page,
        pageSize: query.pageSize,
        defaultPageSize: 12,
    });

    const where = {
        OR: [{ patientId: userId }, { doctorId: userId }],
    };
    if (query.status) where.status = query.status;
    if (query.from || query.to) {
        where.timeBlock = { date: {} };
        if (query.from) where.timeBlock.date.gte = new Date(query.from);
        if (query.to) where.timeBlock.date.lte = new Date(query.to);
    }

    const [total, items] = await Promise.all([
        prisma.appointment.count({ where }),
        prisma.appointment.findMany({
            where,
            orderBy: { timeBlock: { startTime: 'desc' } },
            skip,
            take,
            include: {
                timeBlock: true,
                patient: { select: { id: true, name: true } },
                doctor: { select: { id: true, name: true } },
            },
        }),
    ]);
    return buildPage({ items, total, page, pageSize });
};

exports.createAppointment = async (data) => {
    try {
        const timeBlock = await prisma.timeBlock.findUnique({
            where: { id: data.timeBlockId }
        });
        
        if (!timeBlock) {
            throw new Error('TimeBlock no encontrado');
        }
        
        const existingAppointment = await prisma.appointment.findUnique({
            where: { timeBlockId: data.timeBlockId }
        });
        
        if (existingAppointment) {
            throw new Error('Ya existe una cita para este bloque de tiempo');
        }
        
        const appointment = await prisma.appointment.create({
            data: {
                date: new Date(),
                status: data.status || 'PENDING',
                notes: data.notes,
                timeBlock: {
                    connect: { id: data.timeBlockId }
                },
                patient: {
                    connect: { id: data.patientId }
                },
                doctor: {
                    connect: { id: timeBlock.doctorId }
                }
            },
            include: { timeBlock: true }
        });
        return appointment;
    } catch (error) {
        throw new Error(error.message);
    }
};

/**
 * Cancel an appointment.
 *
 * Rules (spec §2.2):
 *  - Only the owning patient, the owning doctor, or an admin can cancel.
 *  - Cannot cancel a COMPLETED or already CANCELLED appointment (409).
 *  - Frees the slot implicitly: availability queries treat CANCELLED as free.
 *
 * Errors carry .status / .code so the global errorHandler maps them.
 */
exports.cancelAppointment = async (appointmentId, caller, reason) => {
    const id = parseInt(appointmentId, 10);
    if (!Number.isInteger(id) || id <= 0) {
        const e = new Error('Appointment not found');
        e.status = 404; e.code = 'NOT_FOUND';
        throw e;
    }
    const existing = await prisma.appointment.findUnique({ where: { id } });
    if (!existing) {
        const e = new Error('Appointment not found');
        e.status = 404; e.code = 'NOT_FOUND';
        throw e;
    }
    const role = caller.role?.toLowerCase();
    const isOwner = existing.patientId === caller.id || existing.doctorId === caller.id;
    if (!isOwner && role !== 'admin') {
        const e = new Error('Forbidden');
        e.status = 403; e.code = 'FORBIDDEN';
        throw e;
    }
    if (existing.status === 'COMPLETED' || existing.status === 'CANCELLED') {
        const e = new Error(`Cannot cancel an appointment in status ${existing.status}`);
        e.status = 409; e.code = 'INVALID_STATE';
        throw e;
    }

    return prisma.appointment.update({
        where: { id },
        data: {
            status: 'CANCELLED',
            ...(reason !== undefined ? { reason } : {}),
        },
        include: { timeBlock: true },
    });
};

exports.confirmAppointment = async (appointmentId, caller, notes) => {
    const id = parseInt(appointmentId, 10);
    if (!Number.isInteger(id) || id <= 0) {
        const e = new Error('Appointment not found');
        e.status = 404; e.code = 'NOT_FOUND';
        throw e;
    }
    const existing = await prisma.appointment.findUnique({ where: { id } });
    if (!existing) {
        const e = new Error('Appointment not found');
        e.status = 404; e.code = 'NOT_FOUND';
        throw e;
    }
    const role = caller.role?.toLowerCase();
    const isDoctor = existing.doctorId === caller.id;
    if (!isDoctor && role !== 'admin') {
        const e = new Error('Forbidden');
        e.status = 403; e.code = 'FORBIDDEN';
        throw e;
    }
    if (existing.status !== 'PENDING') {
        const e = new Error(`Cannot confirm an appointment in status ${existing.status}`);
        e.status = 409; e.code = 'INVALID_STATE';
        throw e;
    }
    return prisma.appointment.update({
        where: { id },
        data: {
            status: 'CONFIRMED',
            ...(notes !== undefined ? { notes } : {}),
        },
        include: { timeBlock: true },
    });
};

exports.completeAppointment = async (appointmentId, caller, notes) => {
    const id = parseInt(appointmentId, 10);
    if (!Number.isInteger(id) || id <= 0) {
        const e = new Error('Appointment not found');
        e.status = 404; e.code = 'NOT_FOUND';
        throw e;
    }
    const existing = await prisma.appointment.findUnique({ where: { id } });
    if (!existing) {
        const e = new Error('Appointment not found');
        e.status = 404; e.code = 'NOT_FOUND';
        throw e;
    }
    const role = caller.role?.toLowerCase();
    const isDoctor = existing.doctorId === caller.id;
    if (!isDoctor && role !== 'admin') {
        const e = new Error('Forbidden');
        e.status = 403; e.code = 'FORBIDDEN';
        throw e;
    }
    if (existing.status !== 'CONFIRMED') {
        const e = new Error(`Cannot complete an appointment in status ${existing.status}`);
        e.status = 409; e.code = 'INVALID_STATE';
        throw e;
    }
    return prisma.appointment.update({
        where: { id },
        data: {
            status: 'COMPLETED',
            ...(notes !== undefined ? { notes } : {}),
        },
        include: { timeBlock: true },
    });
};

exports.updateAppointment = async (id, data) => {
    try {
        const allowed = {};
        // status intentionally excluded — use PATCH /:id/confirm, /complete, or /cancel
        if (data.notes !== undefined) allowed.notes = data.notes;
        if (data.reason !== undefined) allowed.reason = data.reason;

        const appointment = await prisma.appointment.update({
            where: { id: parseInt(id) },
            data: allowed,
            include: { timeBlock: true }
        });
        return appointment;
    } catch (error) {
        throw new Error('Error al actualizar la cita');
    }
};

exports.deleteAppointment = async (id) => {
    try {
        await prisma.appointment.delete({ where: { id: parseInt(id) } });
    } catch (error) {
        throw new Error('Error al eliminar la cita');
    }
};