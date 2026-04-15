const prisma = require('../utils/prismaClient');

/**
 * Actualiza el perfil del doctor autenticado.
 * Solo permite modificar campos de DoctorProfile — nunca el rol ni datos de User.
 */
const updateDoctorProfile = async (userId, data) => {
    const profile = await prisma.doctorProfile.findUnique({ where: { userId } });
    if (!profile) {
        const e = new Error('Perfil de doctor no encontrado.');
        e.status = 404; e.code = 'NOT_FOUND';
        throw e;
    }

    const allowed = {};
    if (data.specialty   !== undefined) allowed.specialty   = data.specialty;
    if (data.specialties !== undefined) allowed.specialties = data.specialties;
    if (data.hospital    !== undefined) allowed.hospital    = data.hospital || null;
    if (data.location    !== undefined) allowed.location    = data.location || null;
    if (data.bio         !== undefined) allowed.bio         = data.bio     || null;
    if (data.photoUrl    !== undefined) allowed.photoUrl    = data.photoUrl || null;

    return prisma.doctorProfile.update({
        where: { userId },
        data: allowed,
        select: {
            id: true,
            userId: true,
            specialty: true,
            specialties: true,
            hospital: true,
            location: true,
            bio: true,
            photoUrl: true,
            avgRating: true,
            reviewCount: true,
        },
    });
};

module.exports = { updateDoctorProfile };
