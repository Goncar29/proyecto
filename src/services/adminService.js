const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Crear bloque de tiempo con validaciones y chequeo de solapamiento
const createTimeBlockService = async (doctorId, startTime, endTime) => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    if (isNaN(start) || isNaN(end) || start >= end) {
        throw new Error('Invalid startTime/endTime');
    }

    // comprobar solapamiento para el mismo doctor
    const overlapping = await prisma.timeBlock.findFirst({
        where: {
            doctorId: Number(doctorId),
            AND: [
                { startTime: { lt: end } },
                { endTime: { gt: start } }
            ]
        }
    });
    if (overlapping) {
        throw new Error('Time block overlaps with an existing block for this doctor');
    }

    return await prisma.timeBlock.create({
        data: {
            doctorId: Number(doctorId),
            startTime: start,
            endTime: end
        }
    });
};

// Listar reservas con relaciones completas
const listReservationsService = async () => {
    return await prisma.appointment.findMany({
        include: {
            patient: true,
            doctor: true,
            timeBlock: true
        },
        orderBy: { createdAt: 'desc' }
    });
};

// Listar usuarios activos (no eliminados)
const getUsersService = async () => {
    return await prisma.user.findMany({
        where: { deletedAt: null },
        select: {
            id: true,
            email: true,
            name: true,
            role: true,
            isActive: true,
            isSuspended: true,
            createdAt: true,
            updatedAt: true
        },
        orderBy: { createdAt: 'desc' }
    });
};

// Obtener usuario por ID (si no está eliminado)
const getUserIdService = async (id) => {
    const user = await prisma.user.findUnique({
        where: { id: Number(id) },
        select: {
            id: true,
            email: true,
            name: true,
            role: true,
            isActive: true,
            isSuspended: true,
            suspensionReason: true,
            deletedAt: true,
            createdAt: true,
            updatedAt: true
        }
    });
    if (!user || user.deletedAt) return null;
    return user;
};

// Actualizar usuario
const updateUserService = async (id, data) => {
    return await prisma.user.update({
        where: { id: Number(id) },
        data: {
            name: data.name,
            email: data.email,
            role: data.role,
        },
        select: {
            id: true,
            email: true,
            name: true,
            role: true,
            isActive: true,
            isSuspended: true,
            updatedAt: true
        }
    });
};

// Borrado lógico de usuario
const deleteUserIdService = async (id) => {
    return await prisma.user.update({
        where: { id: Number(id) },
        data: { deletedAt: new Date() },
        select: {
            id: true,
            email: true,
            name: true,
            deletedAt: true
        }
    });
};

// Activar/desactivar o suspender usuario
const toggleUserStatusService = async (id, isActive, isSuspended, suspensionReason) => {
    const user = await prisma.user.findUnique({
        where: { id: Number(id) }
    });
    if (!user || user.deletedAt) throw new Error('User not found');

    const data = {};

    if (isActive !== undefined) {
        data.isActive = isActive;
    } else {
        data.isActive = !user.isActive;
    }

    if (isSuspended !== undefined) {
        data.isSuspended = isSuspended;
        data.suspensionReason = isSuspended ? suspensionReason || null : null;
    }

    return await prisma.user.update({
        where: { id: Number(id) },
        data,
        select: {
            id: true,
            email: true,
            isActive: true,
            isSuspended: true,
            suspensionReason: true
        }
    });
};

module.exports = {
    createTimeBlockService,
    listReservationsService,
    getUsersService,
    getUserIdService,
    updateUserService,
    deleteUserIdService,
    toggleUserStatusService
};
