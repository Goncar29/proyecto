const prisma = require('../utils/prismaClient');
const { parsePagination, buildPage } = require('./paginate');

/**
 * Public doctor discovery services.
 *
 * Returns DoctorProfile rows joined to User, reshaped to match the frontend's
 * expected envelope (see spec.md §1.2-§1.5). All listings filter out
 * soft-deleted / inactive / suspended doctors.
 *
 * Conventions:
 *   - The public `:id` we expose is the User.id (stable, already public in
 *     the rest of the API). Internally we go User.id -> DoctorProfile via
 *     the 1:1 relation.
 *   - Errors carry .status, .code — consumed by errorHandler.
 */

function doctorNotFound() {
    const err = new Error('Doctor not found');
    err.status = 404;
    err.code = 'NOT_FOUND';
    return err;
}

function startOfToday() {
    const d = new Date();
    d.setUTCHours(0, 0, 0, 0);
    return d;
}
function addDays(d, n) {
    const copy = new Date(d);
    copy.setUTCDate(copy.getUTCDate() + n);
    return copy;
}

/** Resolve availability filter to a [fromDate, toDate) window. */
function availabilityRange(kind) {
    const today = startOfToday();
    switch (kind) {
        case 'today':
            return { from: today, to: addDays(today, 1) };
        case 'week':
            return { from: today, to: addDays(today, 7) };
        case 'month':
            return { from: today, to: addDays(today, 30) };
        case 'any':
        default:
            return null;
    }
}

/**
 * GET /api/public/doctors — paginated doctor list with filters.
 */
async function listDoctors(query) {
    const { page, pageSize, skip, take } = parsePagination({
        page: query.page,
        pageSize: query.featured ? query.limit || 4 : query.pageSize,
        defaultPageSize: 12,
    });

    // Base AND filter always excludes non-active doctors.
    const where = {
        user: {
            role: 'DOCTOR',
            isActive: true,
            isSuspended: false,
            deletedAt: null,
        },
    };

    if (query.q) {
        where.user.name = { contains: query.q, mode: 'insensitive' };
    }
    if (query.specialty) {
        where.specialty = query.specialty;
    }
    if (query.location) {
        where.location = query.location;
    }

    const availRange = availabilityRange(query.availability);
    if (availRange) {
        // Doctor must have at least one unbooked TimeBlock whose `date` falls
        // in the window. "Unbooked" = appointment IS NULL OR appointment.status = 'CANCELLED'.
        where.user.timeBlocks = {
            some: {
                date: { gte: availRange.from, lt: availRange.to },
                OR: [
                    { appointment: null },
                    { appointment: { status: 'CANCELLED' } },
                ],
            },
        };
    }

    const orderBy = query.featured
        ? [{ avgRating: 'desc' }, { reviewCount: 'desc' }]
        : [{ avgRating: 'desc' }, { user: { name: 'asc' } }];

    const [total, rows] = await Promise.all([
        prisma.doctorProfile.count({ where }),
        prisma.doctorProfile.findMany({
            where,
            orderBy,
            skip,
            take,
            include: {
                user: { select: { id: true, name: true } },
            },
        }),
    ]);

    const items = rows.map((p) => ({
        id: p.user.id,
        name: p.user.name,
        specialty: p.specialty,
        hospital: p.hospital,
        location: p.location,
        photoUrl: p.photoUrl,
        avgRating: p.avgRating,
        reviewCount: p.reviewCount,
    }));

    return buildPage({ items, total, page, pageSize });
}

/**
 * GET /api/public/doctors/:id — full profile + rating histogram.
 */
async function getDoctorById(userId) {
    const profile = await prisma.doctorProfile.findFirst({
        where: {
            user: { id: userId, role: 'DOCTOR', deletedAt: null },
        },
        include: {
            user: { select: { id: true, name: true } },
        },
    });
    if (!profile) throw doctorNotFound();

    // Histogram: count reviews grouped by rating.
    const buckets = await prisma.review.groupBy({
        by: ['rating'],
        where: { doctorProfileId: profile.id },
        _count: { rating: true },
    });
    const histogram = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const b of buckets) {
        histogram[b.rating] = b._count.rating;
    }

    return {
        id: profile.user.id,
        name: profile.user.name,
        specialty: profile.specialty,
        specialties: profile.specialties,
        hospital: profile.hospital,
        location: profile.location,
        bio: profile.bio,
        photoUrl: profile.photoUrl,
        avgRating: profile.avgRating,
        reviewCount: profile.reviewCount,
        ratingHistogram: histogram,
    };
}

/**
 * GET /api/public/doctors/:id/reviews — paginated reviews.
 */
async function getDoctorReviews(userId, query) {
    const profile = await prisma.doctorProfile.findFirst({
        where: { user: { id: userId, role: 'DOCTOR', deletedAt: null } },
        select: { id: true },
    });
    if (!profile) throw doctorNotFound();

    const { page, pageSize, skip, take } = parsePagination({
        page: query.page,
        pageSize: query.pageSize,
        defaultPageSize: 10,
    });

    const orderBy =
        query.sort === 'rating_desc'
            ? [{ rating: 'desc' }, { createdAt: 'desc' }]
            : query.sort === 'rating_asc'
                ? [{ rating: 'asc' }, { createdAt: 'desc' }]
                : [{ createdAt: 'desc' }];

    const [total, reviews] = await Promise.all([
        prisma.review.count({ where: { doctorProfileId: profile.id } }),
        prisma.review.findMany({
            where: { doctorProfileId: profile.id },
            orderBy,
            skip,
            take,
            include: {
                patient: { select: { id: true, name: true } },
            },
        }),
    ]);

    const items = reviews.map((r) => ({
        id: r.id,
        rating: r.rating,
        text: r.text,
        createdAt: r.createdAt,
        helpfulCount: r.helpfulCount,
        patient: r.patient,
    }));

    return buildPage({ items, total, page, pageSize });
}

/**
 * GET /api/public/doctors/:id/availability — unbooked TimeBlocks in window.
 *
 * CANCELLED appointments free up their slot — we include TimeBlocks with
 * appointment IS NULL OR appointment.status = 'CANCELLED'.
 */
async function getDoctorAvailability(userId, query) {
    const profile = await prisma.doctorProfile.findFirst({
        where: { user: { id: userId, role: 'DOCTOR', deletedAt: null } },
        select: { id: true, userId: true },
    });
    if (!profile) throw doctorNotFound();

    // Express 5 req.query is immutable — Joi can't write coerced Dates back.
    const from = query.from ? new Date(query.from) : startOfToday();
    const to = query.to ? new Date(query.to) : addDays(from, 30);

    const blocks = await prisma.timeBlock.findMany({
        where: {
            doctorId: profile.userId,
            date: { gte: from, lte: to },
            OR: [
                { appointment: null },
                { appointment: { status: 'CANCELLED' } },
            ],
        },
        orderBy: { startTime: 'asc' },
        select: {
            id: true,
            date: true,
            startTime: true,
            endTime: true,
        },
    });

    return blocks.map((b) => ({
        id: b.id,
        date: b.date.toISOString().slice(0, 10),
        startTime: b.startTime.toISOString(),
        endTime: b.endTime.toISOString(),
        isBooked: false,
    }));
}

module.exports = {
    listDoctors,
    getDoctorById,
    getDoctorReviews,
    getDoctorAvailability,
};
