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