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
            role: true
        }
    });
    return users;
};

module.exports = { createTimeBlockService, listReservationsService, getUsersService };