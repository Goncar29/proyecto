const prisma = require('../utils/prismaClient');

// crear cita
exports.createReservation = async (data) => {
    const { doctorId, patientId, timeBlockId, reason, notes } = data;

    return prisma.$transaction(async (tx) => {
        // Validaciones
        const patient = await tx.user.findUnique({ where: { id: patientId } });
        if (!patient) { const e = new Error('El paciente no existe.'); e.status = 404; e.code = 'NOT_FOUND'; throw e; }

        const doctor = await tx.user.findUnique({ where: { id: doctorId } });
        if (!doctor) { const e = new Error('El doctor no existe.'); e.status = 404; e.code = 'NOT_FOUND'; throw e; }

        const timeBlock = await tx.timeBlock.findUnique({ where: { id: timeBlockId } });
        if (!timeBlock) { const e = new Error('El bloque de tiempo no existe.'); e.status = 404; e.code = 'NOT_FOUND'; throw e; }

        if (timeBlock.doctorId !== doctorId) {
            const e = new Error('El bloque de tiempo no pertenece a este doctor.');
            e.status = 400; e.code = 'INVALID_INPUT'; throw e;
        }

        const conflict = await tx.appointment.findFirst({ where: { timeBlockId } });
        if (conflict) { const e = new Error('Ya existe una reserva para este bloque de tiempo.'); e.status = 400; e.code = 'CONFLICT'; throw e; }

        return tx.appointment.create({
            data: {
                reason,
                notes,
                date: timeBlock.startTime,
                patient: { connect: { id: patientId } },
                doctor: { connect: { id: doctorId } },
                timeBlock: { connect: { id: timeBlockId } },
            }
        });
    }, {
        isolationLevel: 'Serializable'
    });
};

//GET cita
exports.getReservation = async (id) => {
    return prisma.appointment.findUnique({
        where: { id: parseInt(id, 10) },
        include: {
            patient: { select: { id: true, name: true, email: true, role: true } },
            doctor: { select: { id: true, name: true, email: true, role: true } },
            timeBlock: true
        }
    });
};

//actualizar cita
exports.updateReservation = async (id, data) => {
    const { doctorId, patientId, timeBlockId, reason, notes } = data;

    const patient = await prisma.user.findUnique({ where: { id: patientId } });
    if (!patient) { const e = new Error('El paciente no existe.'); e.status = 404; e.code = 'NOT_FOUND'; throw e; }

    const doctor = await prisma.user.findUnique({ where: { id: doctorId } });
    if (!doctor) { const e = new Error('El doctor no existe.'); e.status = 404; e.code = 'NOT_FOUND'; throw e; }

    const timeBlock = await prisma.timeBlock.findUnique({ where: { id: timeBlockId } });
    if (!timeBlock) { const e = new Error('El bloque de tiempo no existe.'); e.status = 404; e.code = 'NOT_FOUND'; throw e; }

    const conflict = await prisma.appointment.findFirst({
        where: {
            timeBlockId,
            id: { not: parseInt(id, 10) }
        }
    });
    if (conflict) { const e = new Error('Ya existe una reserva para este bloque de tiempo.'); e.status = 400; e.code = 'CONFLICT'; throw e; }

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

// Obtener todas las reservas de un usuario (como paciente o doctor)
exports.getUserReservations = async (userId) => {
    return prisma.appointment.findMany({
        where: {
            OR: [
                { patientId: userId },
                { doctorId: userId }
            ]
        },
        include: {
            patient: { select: { id: true, name: true, email: true, role: true } },
            doctor: { select: { id: true, name: true, email: true, role: true } },
            timeBlock: true
        }
    });
};
