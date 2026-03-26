const prisma = require('../utils/prismaClient');

exports.getUserAppointments = async userId => {
    try {
        const appointments = await prisma.appointment.findMany({
            where: { patientId: parseInt(userId) },
            include: { timeBlock: true }
        });
        return appointments;
    } catch (error) {
        throw new Error('Error al obtener las citas del usuario');
    }
};

exports.createAppointment = async (data, patientId) => {
    try {
        const appointment = await prisma.appointment.create({
            data: {
                patientId,
                timeBlockId: data.timeBlockId,
                status: data.status || 'SCHEDULED',
                notes: data.notes
            },
            include: { timeBlock: true }
        });
        return appointment;
    } catch (error) {
        throw new Error('Error al crear la cita');
    }
};

exports.updateAppointment = async (id, data) => {
    try {
        const appointment = await prisma.appointment.update({
            where: { id: parseInt(id) },
            data,
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