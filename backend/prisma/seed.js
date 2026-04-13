/**
 * Seed script for MediConnect dev database.
 *
 * Builds a minimally-demoable dataset:
 *   - 1 admin
 *   - 2 patients
 *   - 6 doctors, each with a DoctorProfile (specialty, city, bio, photo)
 *   - 14 days × 8 slots/day × 6 doctors of TimeBlocks
 *   - 15 Reviews distributed across doctors, anchored to COMPLETED appointments
 *
 * CRITICAL: Reviews + avgRating/reviewCount denormalization happen inside the
 * same prisma.$transaction. If the aggregate update ever drifted from the
 * review insert, the DoctorProfile would lie to the UI — that's the whole
 * reason the tx exists. This is ACID Atomicity in practice (see the study PDF).
 *
 * Idempotency: this script DESTROYS existing data before seeding.
 * Do not run against prod.
 */
const bcrypt = require('bcryptjs');
const prisma = require('../src/utils/prismaClient');

const PASSWORD_PLAIN = 'password123';
const SALT_ROUNDS = 10;

// --- fixture data ---------------------------------------------------------

const DOCTORS = [
  {
    email: 'carolina.mendez@mediconnect.test',
    name: 'Dra. Carolina Méndez',
    specialty: 'Cardiología',
    specialties: ['Cardiología', 'Medicina Interna'],
    hospital: 'Hospital Italiano',
    location: 'Buenos Aires',
    bio: 'Cardióloga con 12 años de experiencia en prevención y rehabilitación cardíaca.',
    photoUrl: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400',
  },
  {
    email: 'mariano.pereira@mediconnect.test',
    name: 'Dr. Mariano Pereira',
    specialty: 'Pediatría',
    specialties: ['Pediatría', 'Neonatología'],
    hospital: 'Hospital Garrahan',
    location: 'Buenos Aires',
    bio: 'Pediatra con orientación en desarrollo infantil temprano.',
    photoUrl: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400',
  },
  {
    email: 'lucia.fernandez@mediconnect.test',
    name: 'Dra. Lucía Fernández',
    specialty: 'Dermatología',
    specialties: ['Dermatología'],
    hospital: 'Sanatorio Británico',
    location: 'Rosario',
    bio: 'Dermatología clínica y estética. Enfoque en piel sensible.',
    photoUrl: 'https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=400',
  },
  {
    email: 'sebastian.rojas@mediconnect.test',
    name: 'Dr. Sebastián Rojas',
    specialty: 'Traumatología',
    specialties: ['Traumatología', 'Medicina Deportiva'],
    hospital: 'Clínica Alemana',
    location: 'Córdoba',
    bio: 'Traumatólogo deportivo. Atiende lesiones de atletas amateurs y profesionales.',
    photoUrl: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=400',
  },
  {
    email: 'valeria.castro@mediconnect.test',
    name: 'Dra. Valeria Castro',
    specialty: 'Ginecología',
    specialties: ['Ginecología', 'Obstetricia'],
    hospital: 'Hospital Italiano',
    location: 'Buenos Aires',
    bio: 'Ginecóloga y obstetra. Atención integral de la salud de la mujer.',
    photoUrl: 'https://images.unsplash.com/photo-1527613426441-4da17471b66d?w=400',
  },
  {
    email: 'julian.ortiz@mediconnect.test',
    name: 'Dr. Julián Ortiz',
    specialty: 'Neurología',
    specialties: ['Neurología'],
    hospital: 'Fleni',
    location: 'Buenos Aires',
    bio: 'Neurólogo especializado en cefaleas y trastornos del sueño.',
    photoUrl: 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=400',
  },
];

const REVIEW_TEXTS = [
  'Excelente profesional, muy atento y claro en las explicaciones.',
  'Me sentí escuchada. Recomendado totalmente.',
  'Puntual y preciso en el diagnóstico. Volvería sin dudarlo.',
  'Muy buena atención. Resolvió mis dudas con paciencia.',
  'Trato humano y profesional. Excelente experiencia.',
  'Gran predisposición y conocimiento. Súper recomendable.',
  'Atención de primer nivel. Explicó todo el tratamiento con detalle.',
  'Muy conforme con la consulta. Se nota la experiencia.',
];

// --- helpers --------------------------------------------------------------

const TOTAL_DAYS = 14;
const SLOTS_PER_DAY = 8; // 09:00, 10:00, ..., 16:00

/** Returns ISO date at 00:00 of `today + offsetDays`. */
function dayAt(offset) {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + offset);
  return d;
}

/** Returns Date for day offset + hour (UTC). */
function slotAt(offset, hour) {
  const d = dayAt(offset);
  d.setUTCHours(hour, 0, 0, 0);
  return d;
}

// --- main -----------------------------------------------------------------

async function main() {
  console.log('[seed] Wiping existing data...');
  // Order matters — FKs with Restrict would block otherwise.
  await prisma.reviewVote.deleteMany();
  await prisma.review.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.timeBlock.deleteMany();
  await prisma.doctorProfile.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.user.deleteMany();

  const hashed = await bcrypt.hash(PASSWORD_PLAIN, SALT_ROUNDS);

  console.log('[seed] Creating admin + patients...');
  const admin = await prisma.user.create({
    data: {
      email: 'admin@mediconnect.test',
      name: 'Admin MediConnect',
      password: hashed,
      role: 'ADMIN',
    },
  });

  const patient1 = await prisma.user.create({
    data: {
      email: 'paciente1@mediconnect.test',
      name: 'Ana López',
      password: hashed,
      role: 'PATIENT',
    },
  });

  const patient2 = await prisma.user.create({
    data: {
      email: 'paciente2@mediconnect.test',
      name: 'Martín Silva',
      password: hashed,
      role: 'PATIENT',
    },
  });

  console.log('[seed] Creating 6 doctors with DoctorProfiles...');
  const doctorRecords = [];
  for (const d of DOCTORS) {
    // Atomic: User + DoctorProfile always live together.
    const created = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: d.email,
          name: d.name,
          password: hashed,
          role: 'DOCTOR',
        },
      });
      const profile = await tx.doctorProfile.create({
        data: {
          userId: user.id,
          specialty: d.specialty,
          specialties: d.specialties,
          hospital: d.hospital,
          location: d.location,
          bio: d.bio,
          photoUrl: d.photoUrl,
        },
      });
      return { user, profile };
    });
    doctorRecords.push(created);
  }

  console.log('[seed] Creating TimeBlocks (14 days × 8 slots × 6 doctors)...');
  for (const { user: doctor } of doctorRecords) {
    for (let day = 0; day < TOTAL_DAYS; day++) {
      for (let slot = 0; slot < SLOTS_PER_DAY; slot++) {
        const hour = 9 + slot; // 09..16
        await prisma.timeBlock.create({
          data: {
            doctorId: doctor.id,
            date: dayAt(day),
            startTime: slotAt(day, hour),
            endTime: slotAt(day, hour + 1),
          },
        });
      }
    }
  }

  console.log('[seed] Creating 15 COMPLETED appointments + Reviews (atomic)...');
  // To review, we need a COMPLETED appointment per review.
  // We book the first past slots of each doctor and mark them COMPLETED.
  // Seed uses days 0..1 for upcoming demo slots and creates "virtual past"
  // appointments by setting date to -1 / -2 days and status = COMPLETED.
  let reviewsCreated = 0;
  const targetReviews = 15;

  for (let i = 0; i < targetReviews; i++) {
    const doctorIdx = i % doctorRecords.length;
    const { user: doctor, profile } = doctorRecords[doctorIdx];
    const patient = i % 2 === 0 ? patient1 : patient2;

    // Create a past TimeBlock dedicated to this completed appointment.
    const dayOffset = -(Math.floor(i / 2) + 1); // -1, -1, -2, -2, ...
    const hour = 9 + (i % 4);
    const pastBlock = await prisma.timeBlock.create({
      data: {
        doctorId: doctor.id,
        date: dayAt(dayOffset),
        startTime: slotAt(dayOffset, hour),
        endTime: slotAt(dayOffset, hour + 1),
      },
    });

    const pastAppointment = await prisma.appointment.create({
      data: {
        date: dayAt(dayOffset),
        timeBlockId: pastBlock.id,
        patientId: patient.id,
        doctorId: doctor.id,
        status: 'COMPLETED',
      },
    });

    const rating = 3 + (i % 3); // 3,4,5 rotating
    const text = REVIEW_TEXTS[i % REVIEW_TEXTS.length];

    // ATOMIC: review insert + aggregate recompute MUST happen together.
    // If the aggregate update failed out-of-tx, the profile would show a
    // stale avgRating and reviewCount — exactly the inconsistency the
    // Atomicity guarantee prevents. This is textbook ACID.
    await prisma.$transaction(async (tx) => {
      await tx.review.create({
        data: {
          doctorProfileId: profile.id,
          patientId: patient.id,
          appointmentId: pastAppointment.id,
          rating,
          text,
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
    });
    reviewsCreated++;
  }

  console.log('[seed] Done.');
  console.log(`        1 admin, 2 patients, ${doctorRecords.length} doctors`);
  console.log(`        ${TOTAL_DAYS * SLOTS_PER_DAY * doctorRecords.length} future TimeBlocks`);
  console.log(`        ${reviewsCreated} Reviews with recomputed aggregates`);
}

main()
  .catch((e) => {
    console.error('[seed] FAILED:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
