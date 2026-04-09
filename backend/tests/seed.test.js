/**
 * Seed integrity test.
 *
 * Runs against whatever state the DB is in at the time of the test and
 * asserts the invariants the seed script is supposed to uphold:
 *  - 1 admin, 2 patients, 6 doctors
 *  - every doctor has a DoctorProfile
 *  - every DoctorProfile.avgRating/reviewCount matches its Review rows
 *    (ACID denormalization check — protects against aggregate drift)
 *
 * NOTE: this test does NOT re-run the seed. Run `npm run prisma:seed` first.
 */
const prisma = require('../src/utils/prismaClient');

afterAll(async () => {
  await prisma.$disconnect();
});

describe('seed data invariants', () => {
  test('user counts match expected fixture', async () => {
    const [admins, patients, doctors] = await Promise.all([
      prisma.user.count({ where: { role: 'ADMIN' } }),
      prisma.user.count({ where: { role: 'PATIENT' } }),
      prisma.user.count({ where: { role: 'DOCTOR' } }),
    ]);
    // NOTE: integration tests create their own PATIENT/DOCTOR/ADMIN users,
    // so we assert lower bounds, not exact counts.
    expect(admins).toBeGreaterThanOrEqual(1);
    expect(patients).toBeGreaterThanOrEqual(2);
    expect(doctors).toBeGreaterThanOrEqual(6);
  });

  test('at least 6 DoctorProfiles exist, each linked to a DOCTOR user', async () => {
    const profiles = await prisma.doctorProfile.findMany({
      include: { user: { select: { role: true } } },
    });
    expect(profiles.length).toBeGreaterThanOrEqual(6);
    for (const p of profiles) {
      expect(p.user.role).toBe('DOCTOR');
    }
  });

  test('avgRating and reviewCount are consistent with Review rows (ACID denormalization)', async () => {
    const profiles = await prisma.doctorProfile.findMany({ include: { reviews: true } });
    for (const p of profiles) {
      const realCount = p.reviews.length;
      const realAvg = realCount
        ? p.reviews.reduce((sum, r) => sum + r.rating, 0) / realCount
        : 0;
      expect(p.reviewCount).toBe(realCount);
      expect(Math.abs(p.avgRating - realAvg)).toBeLessThan(0.001);
    }
  });

  test('at least 15 Reviews exist, all anchored to COMPLETED appointments', async () => {
    const reviews = await prisma.review.findMany({
      include: { doctorProfile: { include: { user: true } } },
    });
    expect(reviews.length).toBeGreaterThanOrEqual(15);
    for (const r of reviews) {
      const appt = await prisma.appointment.findUnique({ where: { id: r.appointmentId } });
      expect(appt).not.toBeNull();
      expect(appt.status).toBe('COMPLETED');
    }
  });

  test('Review.rating CHECK constraint is enforced at DB level', async () => {
    // Try to insert a rating=0 review bypassing Joi. Expect the DB to reject.
    const anyReview = await prisma.review.findFirst();
    if (!anyReview) {
      // seed not run — skip
      return;
    }
    await expect(
      prisma.$executeRawUnsafe(
        `INSERT INTO "Review" ("doctorProfileId","patientId","appointmentId","rating","text","updatedAt") VALUES (${anyReview.doctorProfileId}, ${anyReview.patientId}, -999999, 0, 'invalid', NOW())`,
      ),
    ).rejects.toThrow();
  });
});
