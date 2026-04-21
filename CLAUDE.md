# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

All commands can be run from the repo root:

```bash
npm run dev             # Backend dev server (node --watch)
npm run dev:frontend    # Frontend Vite dev server (port 5173)
npm test                # Backend test suite (Jest, --runInBand)
npm run test:frontend   # Frontend tests (Vitest)
npm run build           # Build frontend for production
```

Run a single backend test file:
```bash
cd backend && npx jest --runInBand tests/auth.test.js
```

Database:
```bash
cd backend && npx prisma migrate dev --name <migration-name>
cd backend && npx prisma db seed
cd backend && npx prisma studio
```

## Architecture

**Monorepo**: `backend/` (Node/Express/Prisma/PostgreSQL) + `frontend/` (React 19/TypeScript/Vite/Tailwind).  
The frontend proxies `/api` and `/health` to the backend via `vite.config.ts` using `127.0.0.1:{BACKEND_PORT}` (explicit IPv4 — Windows IPv6 dual-stack issue with `localhost`).

**Production deploy**: Frontend → Vercel. Backend → Render (Docker, free tier). Database → Neon PostgreSQL. Uploads → Cloudinary. Email → Resend.

### Backend (`backend/src/`)

**Middleware stack** (`app.js`): helmet → CORS → global rate limit (100/15min) → cookie-parser → body parser (16 KB) → timeout (30 s) → logger → routes → error handler.

**Route prefixes:**
| Prefix | File | Notes |
|--------|------|-------|
| `/api/auth` | `routes/auth.js` | Register, login, refresh, logout, forgot/reset password. `authLimiter` (20/15min) on all. `forgotPasswordLimiter` (5/1hr) on forgot. |
| `/api/admin` | `routes/admin.js` | `authenticateToken + authorizeRole(['admin'])` applied globally via `router.use`. |
| `/api/users` | `routes/users.js` | `/me/password` and `/me/photo` must be declared **before** `/:id` (Express param capture). |
| `/api/doctors` | `routes/doctors.js` | Doctor-scoped profile (`/me/profile`) and photo (`/me/photo`). Reviews (`/:id/reviews`) and votes (`/:id/reviews/:reviewId/vote`). |
| `/api/public/doctors` | `routes/publicDoctors.js` | No auth. List with search, detail, reviews, availability. |
| `/api/appointments` | `routes/appointments.js` | Create, list, cancel, confirm, complete, reschedule, delete (admin). |
| `/api/time-blocks` | `routes/timeBlocks.js` | Role-conditional Joi: `doctorId` required for admin, forbidden for doctor. |

**Error shape** — services throw plain objects:
```js
const err = new Error('message');
err.status = 400;
err.code = 'MY_CODE';   // optional machine-readable
err.details = [...];    // optional
throw err;
```
The global error handler (`middlewares/errorHandler.js`) maps Prisma errors (P2002→409 DUPLICATE, P2025→404 NOT_FOUND, P2003→409 FK_VIOLATION), Joi errors, Multer errors. Always guards `res.headersSent`.

**Audit logging** (`services/audit.js`):
- Signature: `logAudit(userId, action, metadata?)` — third arg is optional (backwards compatible).
- `auditMiddleware(action)` auto-enriches every entry with `{ method, path, statusCode, ip }`.
- Controllers attach extra context via `res.locals.auditMetadata = { changedFields, ... }` — the middleware merges it on `res.finish`.
- Fire-and-forget: errors don't propagate. Sensitive keys (`password`, `token`, `secret`, `apiKey`, `authorization`) are stripped. Metadata >10 KB is replaced with `{ truncated: true, originalSize }`.

**Cloudinary uploads** (`utils/cloudinary.js`):
```js
uploadBuffer(buffer, folder, extraOpts?)
// extraOpts: { public_id, overwrite } for deterministic slots
```
User avatars use `{ public_id: 'user-{id}', overwrite: true }` — one Cloudinary slot per user. Doctor photos are non-deterministic (new public_id each upload).

**Email** (`utils/email.js`): Uses Resend. Fire-and-forget in controllers — errors don't block the response. Functions: `sendPasswordResetEmail`, `sendAppointmentConfirmedEmail`, `sendAppointmentReminderEmail`.

**Reminder job** (`jobs/reminderJob.js`): node-cron task that runs every hour. Finds appointments with `status=CONFIRMED`, `date` within 24h, and `reminderSentAt=null`. Sends email and sets `reminderSentAt` to prevent duplicates (idempotent).

### Authentication flow

1. Login → issues a **short-lived JWT** (15 min, `{ id, role }` with `role` **lowercase**) + a **refresh token** stored as `sha256(plain)` in DB; plain goes to an httpOnly cookie.
2. `authenticateToken` does a **DB lookup on every request** (intentional — no cache) to reject suspended/deleted users before JWT expiry. It merges fresh `role` and `email` from DB into `req.user` with `.toLowerCase()` to keep consistency with the JWT.
3. Refresh rotates both tokens (old one revoked); concurrent 401s share the same refresh promise in the frontend client to prevent race conditions.

**Critical role casing gotcha**: DB stores `ADMIN/DOCTOR/PATIENT` (uppercase enum). JWT and all code comparisons use lowercase. Always call `user.role.toLowerCase()` when reading from DB. The auth middleware handles this — but any new service code that reads `user.role` directly must normalize.

**Cookie settings** (auth controller): `httpOnly: true`, `sameSite: 'strict'`, `secure: true` in production, `path: '/api/auth'` (scope-limited).

### Data models (Prisma)

Key relationships:
- `User` → `Appointment[]` (as patient, `PatientAppointments`)
- `User` → `Appointment[]` (as doctor, `DoctorAppointments`)
- `User` → `DoctorProfile` (1:1, only for DOCTOR role)
- `Appointment` → `Review` (1:1, optional — only after COMPLETED)
- `Review` → `ReviewVote[]` (toggle: +1/-1, unique per user per review)
- `Appointment` → `TimeBlock` (1:1, unique constraint prevents double-booking)

Soft deletes: `User.deletedAt` — always filter `where: { deletedAt: null }` when querying active users.

`TimeBlock.date` = midnight UTC of the same day as `startTime`. Always set it when creating time blocks:
```js
date: new Date(startTime.toISOString().split('T')[0] + 'T00:00:00.000Z')
```

### Frontend (`frontend/src/`)

**Context providers**: `AuthContext` (user, token, refreshUser), `ToastContext`, `ThemeContext`.

**API client** (`api/client.ts`): `api.get/post/put/patch/delete/postFile`. On 401 (non-auth endpoint) it calls `/auth/refresh` with the httpOnly cookie and retries once. Use `api.postFile(endpoint, formData)` for multipart uploads — it omits `Content-Type` so the browser sets the boundary.

**Protected routes**: wrap with `<ProtectedRoute roles={['ADMIN']}>` (roles optional). Public routes: `/`, `/login`, `/register`, `/forgot-password`, `/reset-password`, `/doctors`, `/doctors/:id`.

**`UserAvatar` component** (`components/UserAvatar.tsx`): generic photo-or-initials primitive. Props: `name`, `photoUrl?`, `size` (`sm`/`md`/`lg`). Use this instead of inline avatar markup.

### Testing

Backend tests use Jest + Supertest against a real DB. Tests **must run serially** (`--runInBand`). 246 tests across 28 suites — all passing.

Shared test helpers (`tests/helpers/setupUsers.js`):
```js
const { createTestUsers, deleteTestUsers, TEST_PASSWORD } = require('./helpers/setupUsers');
// TEST_PASSWORD = 'password123'
// creates: test_patient@test.com, test_doctor@test.com, test_admin@test.com
```
Always call `deleteTestUsers()` in `beforeAll` and `afterAll`, and `prisma.$disconnect()` in `afterAll`.

Mock Cloudinary and email in tests:
```js
jest.mock('../src/utils/cloudinary', () => ({ uploadBuffer: jest.fn().mockResolvedValue({ secure_url: '...', public_id: '...' }) }));
jest.mock('../src/utils/email', () => ({
  sendPasswordResetEmail: jest.fn().mockResolvedValue(),
  sendAppointmentConfirmedEmail: jest.fn().mockResolvedValue(),
  sendAppointmentReminderEmail: jest.fn().mockResolvedValue(),
}));
```

### Key conventions

- **Soft deletes**: `User.deletedAt` — always filter `where: { deletedAt: null }` when querying active users.
- **Prisma transactions**: use `prisma.$transaction(async tx => {...})` for any operation that must be atomic (appointment booking, token rotation, password change, review creation with avgRating update).
- **`res.locals.auditMetadata`**: set this in controllers before `res.json()` to enrich the audit entry for that request.
- **Route ordering**: in `users.js`, `/me/*` routes must appear before `/:id` or Express will treat `me` as an ID param. Same applies to `doctors.js`.
- **`updateUserService`** (in `userService.js`) already hashes passwords with bcryptjs. Do not pre-hash before passing to it or the password will be double-hashed.
- **DoctorProfile avgRating/reviewCount**: always update these fields in the same transaction as the review insert/delete. Never update them separately.
- **Role-conditional Joi schemas**: use `Joi.when(Joi.ref('$role'), { is: 'admin', then: ... })` pattern (already used in timeBlockSchema). Pass `{ context: { role } }` as the second arg to `schema.validate()`.
