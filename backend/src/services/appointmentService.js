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
    return prisma.$transaction(async (tx) => {
        const timeBlock = await tx.timeBlock.findUnique({
            where: { id: data.timeBlockId },
        });
        if (!timeBlock) {
            const e = new Error('El bloque de tiempo no existe.');
            e.status = 404; e.code = 'NOT_FOUND';
            throw e;
        }

        if (timeBlock.startTime <= new Date()) {
            const e = new Error('No se puede reservar un horario que ya pasó.');
            e.status = 409; e.code = 'TIME_BLOCK_EXPIRED';
            throw e;
        }

        const existingAppointment = await tx.appointment.findUnique({
            where: { timeBlockId: data.timeBlockId },
        });
        if (existingAppointment) {
            const e = new Error('Ya existe una cita para este bloque de tiempo.');
            e.status = 409; e.code = 'CONFLICT';
            throw e;
        }

        return tx.appointment.create({
            data: {
                date: timeBlock.startTime,
                status: data.status || 'PENDING',
                notes: data.notes,
                timeBlock: { connect: { id: data.timeBlockId } },
                patient:   { connect: { id: data.patientId } },
                doctor:    { connect: { id: timeBlock.doctorId } },
            },
            include: { timeBlock: true },
        });
    });
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
        include: {
            timeBlock: true,
            patient: { select: { id: true, name: true, email: true } },
            doctor:  { select: { id: true, name: true, email: true } },
        },
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
        include: {
            timeBlock: true,
            patient: { select: { id: true, name: true, email: true } },
            doctor:  { select: { id: true, name: true, email: true } },
        },
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
    const numId = parseInt(id, 10);
    const existing = await prisma.appointment.findUnique({ where: { id: numId } });
    if (!existing) {
        const e = new Error('Cita no encontrada');
        e.status = 404; e.code = 'NOT_FOUND';
        throw e;
    }

    const allowed = {};
    // status intentionally excluded — use PATCH /:id/confirm, /complete, or /cancel
    if (data.notes !== undefined) allowed.notes = data.notes;
    if (data.reason !== undefined) allowed.reason = data.reason;

    return prisma.appointment.update({
        where: { id: numId },
        data: allowed,
        include: { timeBlock: true },
    });
};

/**
 * Reschedule an appointment to a different time block.
 *
 * Rules:
 *  - Only the owning patient or an admin can reschedule.
 *  - Only PENDING or CONFIRMED appointments can be rescheduled.
 *  - New time block must belong to the same doctor.
 *  - New time block must be free (no other appointment).
 */
exports.rescheduleAppointment = async (appointmentId, caller, newTimeBlockId) => {
    const id = parseInt(appointmentId, 10);
    if (!Number.isInteger(id) || id <= 0) {
        const e = new Error('Cita no encontrada');
        e.status = 404; e.code = 'NOT_FOUND';
        throw e;
    }

    return prisma.$transaction(async (tx) => {
        const existing = await tx.appointment.findUnique({ where: { id } });
        if (!existing) {
            const e = new Error('Cita no encontrada');
            e.status = 404; e.code = 'NOT_FOUND';
            throw e;
        }

        const role = caller.role?.toLowerCase();
        if (existing.patientId !== caller.id && role !== 'admin') {
            const e = new Error('Forbidden');
            e.status = 403; e.code = 'FORBIDDEN';
            throw e;
        }

        if (existing.status !== 'PENDING' && existing.status !== 'CONFIRMED') {
            const e = new Error(`No se puede reprogramar una cita en estado ${existing.status}`);
            e.status = 409; e.code = 'INVALID_STATE';
            throw e;
        }

        const newTimeBlock = await tx.timeBlock.findUnique({ where: { id: newTimeBlockId } });
        if (!newTimeBlock) {
            const e = new Error('El nuevo bloque de tiempo no existe.');
            e.status = 404; e.code = 'NOT_FOUND';
            throw e;
        }

        if (newTimeBlock.doctorId !== existing.doctorId) {
            const e = new Error('El nuevo bloque de tiempo no pertenece al mismo doctor.');
            e.status = 400; e.code = 'INVALID_INPUT';
            throw e;
        }

        const conflict = await tx.appointment.findFirst({
            where: { timeBlockId: newTimeBlockId, id: { not: id } },
        });
        if (conflict) {
            const e = new Error('El bloque de tiempo seleccionado ya está reservado.');
            e.status = 409; e.code = 'CONFLICT';
            throw e;
        }

        return tx.appointment.update({
            where: { id },
            data: {
                timeBlockId: newTimeBlockId,
                date: newTimeBlock.startTime,
            },
            include: {
                timeBlock: true,
                patient: { select: { id: true, name: true } },
                doctor:  { select: { id: true, name: true } },
            },
        });
    });
};

exports.deleteAppointment = async (id) => {
    const numId = parseInt(id, 10);
    const existing = await prisma.appointment.findUnique({ where: { id: numId } });
    if (!existing) {
        const e = new Error('Cita no encontrada');
        e.status = 404; e.code = 'NOT_FOUND';
        throw e;
    }
    await prisma.appointment.delete({ where: { id: numId } });
};