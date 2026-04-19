const prisma = require('../utils/prismaClient');
const { parsePagination, buildPage } = require('./paginate');

// Crear bloque de tiempo con validaciones y chequeo de solapamiento
const createTimeBlockService = async (doctorId, startTime, endTime) => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    if (isNaN(start) || isNaN(end) || start >= end) {
        const e = new Error('Las fechas de inicio y fin no son válidas o el inicio es posterior al fin.');
        e.status = 400;
        throw e;
    }
    if (start <= new Date()) {
        const e = new Error('La hora de inicio no puede ser en el pasado.');
        e.status = 400;
        throw e;
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
            const e = new Error('El horario se superpone con un bloque existente de este doctor.');
            e.status = 409;
            e.code = 'CONFLICT';
            throw e;
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

// Listar reservas con relaciones completas (paginado, filtrable por status y búsqueda)
const listReservationsService = async ({ page, pageSize, status, search } = {}) => {
    const { page: p, pageSize: ps, skip, take } = parsePagination({ page, pageSize, defaultPageSize: 20 });

    const where = {};
    if (status) where.status = status;
    if (search) {
        const q = search.trim();
        where.OR = [
            { patient: { name: { contains: q, mode: 'insensitive' } } },
            { patient: { email: { contains: q, mode: 'insensitive' } } },
            { doctor: { name: { contains: q, mode: 'insensitive' } } },
            { doctor: { email: { contains: q, mode: 'insensitive' } } },
        ];
    }

    const include = {
        patient: { select: { id: true, name: true, email: true, role: true } },
        doctor: { select: { id: true, name: true, email: true, role: true } },
        timeBlock: true,
    };

    const [items, total] = await prisma.$transaction([
        prisma.appointment.findMany({ where, include, orderBy: { createdAt: 'desc' }, skip, take }),
        prisma.appointment.count({ where }),
    ]);

    return buildPage({ items, total, page: p, pageSize: ps });
};

// Listar usuarios activos (no eliminados) con paginación opcional
const getUsersService = async ({ page = 1, pageSize = 50 } = {}) => {
    const take = Math.min(Math.max(1, Number(pageSize)), 200);
    const skip = (Math.max(1, Number(page)) - 1) * take;
    const where = { deletedAt: null };

    const [items, total] = await prisma.$transaction([
        prisma.user.findMany({
            where,
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
            orderBy: { createdAt: 'desc' },
            skip,
            take,
        }),
        prisma.user.count({ where }),
    ]);

    return { items, total, page: Number(page), pageSize: take };
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
        const error = new Error('El rol especificado no es válido. Debe ser PATIENT, DOCTOR o ADMIN.');
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
        
        if (!user || user.deletedAt) {
            const e = new Error('El usuario no existe.');
            e.status = 404; e.code = 'NOT_FOUND';
            throw e;
        }

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
const promoteToDoctorService = async (userId, { specialty, specialties, hospital, location, bio, photoUrl }) => {
    const id = Number(userId);

    return await prisma.$transaction(async (tx) => {
        const user = await tx.user.findUnique({ where: { id } });

        if (!user || user.deletedAt) {
            const e = new Error('El usuario no existe.');
            e.status = 404; e.code = 'NOT_FOUND';
            throw e;
        }
        if (!user.isActive || user.isSuspended) {
            const e = new Error('La cuenta del usuario está inactiva o suspendida.');
            e.status = 409; e.code = 'INVALID_STATE';
            throw e;
        }
        if (user.role === 'DOCTOR') {
            const e = new Error('El usuario ya tiene el rol de doctor.');
            e.status = 409; e.code = 'ALREADY_DOCTOR';
            throw e;
        }
        if (user.role !== 'PATIENT') {
            const e = new Error('Solo se puede promover a doctor a usuarios con rol de paciente.');
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
                photoUrl: photoUrl || null,
            },
        });

        return { user: updatedUser, doctorProfile: profile };
    });
};

/**
 * Crea bloques de tiempo en masa para un doctor.
 * Genera slots a partir del rango de fechas, días de la semana, horario y duración.
 * Usa createMany({ skipDuplicates: true }) — devuelve { created, skipped, total }.
 */
const bulkCreateTimeBlocks = async ({ doctorId, startDate, endDate, daysOfWeek, startHour, endHour, slotDurationMin }) => {
    // Validar que slotDuration divide exactamente el rango horario
    const rangeMinutes = (endHour - startHour) * 60;
    if (rangeMinutes % slotDurationMin !== 0) {
        const e = new Error(`La duración del slot (${slotDurationMin} min) no divide exactamente el rango horario (${rangeMinutes} min). Usá: ${
            [15, 20, 30, 45, 60, 90, 120].filter(d => rangeMinutes % d === 0).join(', ') || 'ningún valor estándar'
        }.`);
        e.status = 400;
        e.code = 'INVALID_SLOT_DURATION';
        throw e;
    }

    // Validar que el doctor existe y tiene rol DOCTOR
    const doctor = await prisma.user.findUnique({ where: { id: Number(doctorId) } });
    if (!doctor || doctor.role !== 'DOCTOR') {
        const e = new Error('El usuario no es un doctor válido.');
        e.status = 400;
        e.code = 'NOT_A_DOCTOR';
        throw e;
    }

    // Generar todos los slots dentro del rango
    const now = new Date();
    const slots = [];

    const current = new Date(startDate);
    current.setUTCHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setUTCHours(0, 0, 0, 0);

    while (current <= end) {
        if (daysOfWeek.includes(current.getUTCDay())) {
            for (let minOffset = 0; minOffset < rangeMinutes; minOffset += slotDurationMin) {
                const slotStart = new Date(current);
                slotStart.setUTCHours(startHour, minOffset, 0, 0);
                const slotEnd = new Date(slotStart);
                slotEnd.setUTCMinutes(slotEnd.getUTCMinutes() + slotDurationMin);

                // Saltar slots pasados
                if (slotStart <= now) continue;

                const date = new Date(slotStart);
                date.setUTCHours(0, 0, 0, 0);

                slots.push({
                    doctorId: Number(doctorId),
                    startTime: slotStart,
                    endTime: slotEnd,
                    date,
                });
            }
        }
        current.setUTCDate(current.getUTCDate() + 1);
    }

    // Validar que quedan slots válidos
    if (slots.length === 0) {
        const e = new Error('No hay slots válidos en el rango especificado (todos están en el pasado o ningún día coincide).');
        e.status = 400;
        e.code = 'NO_VALID_SLOTS';
        throw e;
    }

    // Cap de 500 slots por request
    if (slots.length > 500) {
        const e = new Error(`Se generarían ${slots.length} slots. El máximo permitido es 500. Reducí el rango de fechas o aumentá la duración del slot.`);
        e.status = 400;
        e.code = 'TOO_MANY_SLOTS';
        throw e;
    }

    const result = await prisma.timeBlock.createMany({
        data: slots,
        skipDuplicates: true,
    });

    return {
        created: result.count,
        skipped: slots.length - result.count,
        total: slots.length,
    };
};

module.exports = {
    createTimeBlockService,
    bulkCreateTimeBlocks,
    listReservationsService,
    getUsersService,
    getUserIdService,
    updateUserService,
    deleteUserIdService,
    toggleUserStatusService,
    promoteToDoctorService,
};
