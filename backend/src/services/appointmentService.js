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
            include: { timeBlock: true },
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

exports.updateAppointment = async (id, data) => {
    try {
        const allowed = {};
        if (data.status !== undefined) allowed.status = data.status;
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