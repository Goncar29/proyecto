const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const createTimeBlockService = async (startTime, endTime) => {
    const newTimeBlock = await prisma.timeBlock.create({
        data: {
            startTime: new Date(startTime),
            endTime: new Date(endTime)
        }
    });
    return newTimeBlock;
};

const listReservationsService = async () => {
    const reservations = await prisma.appointment.findMany({
        include: {
            user: true,
            timeBlock: true
        }
    });
    return reservations;
};

const getUsersService = async () => {
    const users = await prisma.user.findMany({
        select: {
            id: true,
            email: true,
            name: true,
            role: true,
            isActive: true,
            isSuspended: true,
            createdAt: true,
            updatedAt: true
        }
    });
    return users;
};

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
            createdAt: true,
            updatedAt: true
        }
    });
    return user;
};

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
    })
};

const deleteUserIdService = async (id) => {
    return await prisma.user.delete({
        where: { id: Number(id) }
    });
};

const toggleUserStatusService = async (id, isActive, isSuspended, suspensionReason) => {
    const user = await prisma.user.findUnique({
        where: { id: Number(id) }
    });
    if (!user) throw new Error('User not found');

    // Construir objeto de actualización solo con campos válidos
    const data = {};

    // Activar/desactivar usuario
    if (isActive !== undefined) {
        data.isActive = isActive;
    } else {
        data.isActive = !user.isActive; // toggle automático si no se envía
    }

    // Suspender/activar suspensión
    if (isSuspended !== undefined) {
        data.isSuspended = isSuspended;
        data.suspensionReason = isSuspended ? suspensionReason || null : null;
    }

    return await prisma.user.update({
        where: { id: Number(id) },
        data,
        select: { id: true, email: true, isActive: true, isSuspended: true, suspensionReason: true }
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