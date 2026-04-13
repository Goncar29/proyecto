const prisma = require('../utils/prismaClient');

// Crear bloque de tiempo con validaciones y chequeo de solapamiento
const createTimeBlockService = async (doctorId, startTime, endTime) => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    if (isNaN(start) || isNaN(end) || start >= end) {
        throw new Error('Invalid startTime/endTime');
    }
    if (start <= new Date()) {
        throw new Error('startTime must be in the future');
    }

    const doctor = await prisma.user.findUnique({ where: { id: parseInt(doctorId) } });
    if (!doctor || doctor.role !== 'DOCTOR') {
        const error = new Error('El usuario no es un doctor válido');
        error.status = 400;
        throw error;
    }

    return await prisma.$transaction(async (tx) => {
        const overlapping = await tx.timeBlock.findFirst({
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

        const date = new Date(start);
        date.setUTCHours(0, 0, 0, 0);

        return await tx.timeBlock.create({
            data: {
                doctorId: Number(doctorId),
                startTime: start,
                endTime: end,
                date,
            }
        });
    });
};

// Listar reservas con relaciones completas
const listReservationsService = async () => {
    return await prisma.appointment.findMany({
        include: {
            patient: { select: { id: true, name: true, email: true, role: true } },
            doctor: { select: { id: true, name: true, email: true, role: true } },
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
            updatedAt: true,
            doctorProfile: { select: { specialty: true } },
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
    const VALID_ROLES = ['PATIENT', 'DOCTOR', 'ADMIN'];
    if (data.role && !VALID_ROLES.includes(data.role.toUpperCase())) {
        const error = new Error('Invalid role');
        error.status = 400;
        throw error;
    }
    if (data.role) data.role = data.role.toUpperCase();

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
    return await prisma.$transaction(async (tx) => {
        const user = await tx.user.findUnique({
            where: { id: Number(id) }
        });
        
        if (!user || user.deletedAt) throw new Error('User not found');

        const data = {};
        data.isActive = isActive !== undefined ? isActive : !user.isActive;
        
        if (isSuspended !== undefined) {
            data.isSuspended = isSuspended;
            data.suspensionReason = isSuspended ? suspensionReason || null : null;
        }

        return await tx.user.update({
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
    });
};

// Promover PATIENT a DOCTOR atómicamente (role + DoctorProfile)
const promoteToDoctorService = async (userId, { specialty, specialties, hospital, location, bio }) => {
    const id = Number(userId);

    return await prisma.$transaction(async (tx) => {
        const user = await tx.user.findUnique({ where: { id } });

        if (!user || user.deletedAt) {
            const e = new Error('User not found');
            e.status = 404; e.code = 'NOT_FOUND';
            throw e;
        }
        if (!user.isActive || user.isSuspended) {
            const e = new Error('User account is inactive or suspended');
            e.status = 409; e.code = 'INVALID_STATE';
            throw e;
        }
        if (user.role === 'DOCTOR') {
            const e = new Error('User is already a DOCTOR');
            e.status = 409; e.code = 'ALREADY_DOCTOR';
            throw e;
        }
        if (user.role !== 'PATIENT') {
            const e = new Error('Only PATIENT users can be promoted to DOCTOR');
            e.status = 409; e.code = 'INVALID_ROLE';
            throw e;
        }

        const updatedUser = await tx.user.update({
            where: { id },
            data: { role: 'DOCTOR' },
            select: { id: true, email: true, name: true, role: true },
        });

        const profile = await tx.doctorProfile.create({
            data: {
                userId: id,
                specialty,
                specialties: specialties || [specialty],
                hospital: hospital || null,
                location: location || null,
                bio: bio || null,
            },
        });

        return { user: updatedUser, doctorProfile: profile };
    });
};

module.exports = {
    createTimeBlockService,
    listReservationsService,
    getUsersService,
    getUserIdService,
    updateUserService,
    deleteUserIdService,
    toggleUserStatusService,
    promoteToDoctorService,
};
