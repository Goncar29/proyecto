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

module.exports = {
    createTimeBlockService,
    listReservationsService,
    getUsersService,
    getUserIdService,
    updateUserService,
    deleteUserIdService
};