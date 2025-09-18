const prisma = require('../utils/prismaClient');

exports.getUserAppointments = async userId => {
    try {
        const appointments = await prisma.appointment.findMany({
            where: { userId: parseInt(userId) },
            include: { timeBlock: true }
        });
        return appointments;
    } catch (error) {
        throw new Error('Error al obtener las citas del usuario');
    }
};