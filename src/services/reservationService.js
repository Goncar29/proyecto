const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.createReservation = async (data) => {
    const conflict = await prisma.appointment.findFirst({
        where: {
            date: data.date,
            timeBlockId: data.timeBlockId,
        }
    });
    if (conflict) {
        throw new Error('Ya existe una reserva para esta fecha y bloque de tiempo');
    };
    return prisma.appointment.create({ data });
};

exports.getReservation = async (id) => {
    return prisma.appointment.findUnique({
        where: { id: parseInt(id, 10) }
    });
};

exports.updateReservation = async (id, data) => {
    const conflict = await prisma.appointment.findFirst({
        where: {
            date: data.date,
            timeBlockId: data.timeBlockId,
            id: { not: parseInt(id, 10) }
        }
    });
    if (conflict) {
        throw new Error('Ya existe una reserva para esta fecha y bloque de tiempo');
    };
    return prisma.appointment.update({
        where: { id: parseInt(id, 10) },
        data
    });
};

exports.deleteReservation = id => {
    return prisma.appointment.delete({
        where: { id: parseInt(id, 10) }
    });
};