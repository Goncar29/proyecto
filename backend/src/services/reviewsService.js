const { Prisma } = require('@prisma/client');
const prisma = require('../utils/prismaClient');

/**
 * POST /api/doctors/:id/reviews — create a review for a doctor.
 *
 * ACID pattern (mirrors seed.js and spec §2.5):
 *   Under Serializable isolation —
 *     1. Validate the caller is a PATIENT and owns a COMPLETED appointment
 *        with this doctor.
 *     2. Insert the Review row (appointmentId is @unique — catches duplicates
 *        at the DB level if two requests race past our explicit check).
 *     3. Recompute DoctorProfile.avgRating + reviewCount from all reviews on
 *        that profile and UPDATE in the same transaction.
 *
 * Why Serializable: two concurrent patients reviewing the same doctor could
 * both read the same stale aggregate and then UPDATE with divergent values,
 * losing one review's contribution (classic lost-update). Serializable forces
 * Postgres to abort one of the transactions, we retry implicitly via Prisma.
 *
 * All thrown errors carry .status and .code — consumed by errorHandler.
 */

function httpError(message, status, code) {
    const e = new Error(message);
    e.status = status;
    e.code = code;
    return e;
}

async function createReview(doctorUserId, caller, body) {
    if (caller.role?.toLowerCase() !== 'patient') {
        throw httpError('Only patients can create reviews', 403, 'FORBIDDEN');
    }

    // Resolve the DoctorProfile from the public doctor id (== User.id).
    const profile = await prisma.doctorProfile.findFirst({
        where: {
            user: { id: doctorUserId, role: 'DOCTOR', deletedAt: null },
        },
        select: { id: true, userId: true },
    });
    if (!profile) throw httpError('Doctor not found', 404, 'NOT_FOUND');

    // Validate the backing appointment: must belong to caller, same doctor,
    // and be COMPLETED.
    const appt = await prisma.appointment.findUnique({
        where: { id: body.appointmentId },
    });
    if (!appt) {
        throw httpError('Appointment not found', 404, 'NOT_FOUND');
    }
    if (appt.patientId !== caller.id) {
        throw httpError('Cannot review an appointment that is not yours', 403, 'FORBIDDEN');
    }
    if (appt.doctorId !== profile.userId) {
        throw httpError('Appointment does not match this doctor', 400, 'MISMATCH');
    }
    if (appt.status !== 'COMPLETED') {
        throw httpError(
            'Cannot review an appointment that is not COMPLETED',
            409,
            'INVALID_STATE',
        );
    }

    // Explicit pre-check for friendly error; the @unique constraint is the
    // real guarantee if two requests race.
    const dup = await prisma.review.findUnique({
        where: { appointmentId: body.appointmentId },
    });
    if (dup) {
        throw httpError('This appointment was already reviewed', 409, 'ALREADY_EXISTS');
    }

    try {
        return await prisma.$transaction(
            async (tx) => {
                const review = await tx.review.create({
                    data: {
                        doctorProfileId: profile.id,
                        patientId: caller.id,
                        appointmentId: body.appointmentId,
                        rating: body.rating,
                        text: body.text ?? '',
                    },
                });

                const agg = await tx.review.aggregate({
                    where: { doctorProfileId: profile.id },
                    _avg: { rating: true },
                    _count: { _all: true },
                });

                await tx.doctorProfile.update({
                    where: { id: profile.id },
                    data: {
                        avgRating: agg._avg.rating ?? 0,
                        reviewCount: agg._count._all,
                    },
                });

                return review;
            },
            { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );
    } catch (err) {
        // Map the @unique race-loser to a clean 409.
        if (err.code === 'P2002') {
            throw httpError('This appointment was already reviewed', 409, 'ALREADY_EXISTS');
        }
        throw err;
    }
}

module.exports = { createReview };
