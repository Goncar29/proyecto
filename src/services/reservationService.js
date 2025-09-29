const prisma = require('../utils/prismaClient');

// crear cita
exports.createReservation = async (data) => {
    const { doctorId, patientId, timeBlockId, reason, notes } = data;

    // Validaciones
    const patient = await prisma.user.findUnique({ where: { id: patientId } });
    if (!patient) throw new Error('El paciente no existe');

    const doctor = await prisma.user.findUnique({ where: { id: doctorId } });
    if (!doctor) throw new Error('El doctor no existe');

    const timeBlock = await prisma.timeBlock.findUnique({ where: { id: timeBlockId } });
    if (!timeBlock) throw new Error('El bloque de tiempo no existe');

    const conflict = await prisma.appointment.findFirst({ where: { timeBlockId } });
    if (conflict) throw new Error('Ya existe una reserva para este bloque de tiempo');

    // Crear la cita con relaciones
    return prisma.appointment.create({
        data: {
            reason,
            notes,
            date: timeBlock.startTime,
            patient: { connect: { id: patientId } },
            doctor: { connect: { id: doctorId } },
            timeBlock: { connect: { id: timeBlockId } },
        }
    });
};

//GET cita
exports.getReservation = async (id) => {
    return prisma.appointment.findUnique({
        where: { id: parseInt(id, 10) },
        include: {
            patient: true,
            doctor: true,
            timeBlock: true
        }
    });
};

//actualizar cita
exports.updateReservation = async (id, data) => {
    const { doctorId, patientId, timeBlockId, reason, notes } = data;

    const patient = await prisma.user.findUnique({ where: { id: patientId } });
    if (!patient) throw new Error('El paciente no existe');

    const doctor = await prisma.user.findUnique({ where: { id: doctorId } });
    if (!doctor) throw new Error('El doctor no existe');

    const timeBlock = await prisma.timeBlock.findUnique({ where: { id: timeBlockId } });
    if (!timeBlock) throw new Error('El bloque de tiempo no existe');

    const conflict = await prisma.appointment.findFirst({
        where: {
            timeBlockId,
            id: { not: parseInt(id, 10) }
        }
    });
    if (conflict) throw new Error('Ya existe una reserva para este bloque de tiempo');

    return prisma.appointment.update({
        where: { id: parseInt(id, 10) },
        data: {
            reason,
            notes,
            date: timeBlock.startTime,
            patient: { connect: { id: patientId } },
            doctor: { connect: { id: doctorId } },
            timeBlock: { connect: { id: timeBlockId } }
        }
    });
};

//Eliminar cita
exports.deleteReservation = async (id) => {
    return prisma.appointment.delete({
        where: { id: parseInt(id, 10) }
    });
};
