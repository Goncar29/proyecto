# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Monorepo layout

This repo is an npm workspaces monorepo:

```
/                   ← root (workspace manifest only)
├── backend/        ← @mediconnect/backend — Express + Prisma API
└── frontend/       ← @mediconnect/frontend — Vite + React + TS (scaffolded in P6)
```

All backend code lives under `backend/` — `backend/backend/src/`, `backend/prisma/`, `backend/tests/`, `backend/.env`, `backend/.env.example`.

## Commands

```bash
# Install dependencies (both workspaces)
npm install

# Backend — run from root or from backend/
npm run dev:backend            # hot-reload (node --watch)
npm run start                  # production
npm run test                   # jest --runInBand
npm run test --workspace=@mediconnect/backend -- --coverage

# Prisma — run from backend/ (needs .env)
cd backend && npx prisma migrate dev
cd backend && npx prisma generate
cd backend && npx prisma db seed

# Frontend (after P6)
npm run dev:frontend
```

Server runs on `http://localhost:3006`. Swagger UI at `http://localhost:3006/api/docs`.

Tests: Jest + Supertest under `backend/tests/`. No lint script yet.

## Architecture

This is a Node.js/Express REST API for medical appointment booking. The stack is Express 5, Prisma ORM, PostgreSQL, JWT auth, Joi validation, and Swagger docs.

**Request flow:**

```
Request
  → express.json()
  → /api router (backend/backend/src/routes/index.js)
    → authenticateToken (JWT verification → populates req.user with { id, role })
    → authorizeRole([...roles]) (role check — roles are lowercased in the JWT)
    → validate(schema, options) (Joi validation — replaces req.body with validated value)
    → auditMiddleware(action) (fires logAudit on res 'finish' if status 2xx)
    → controller (calls service, returns JSON)
  → errorHandler (global — maps err.status or defaults to 500)
```

**Route tree:**

```
/api/auth              → public (register always creates PATIENT role)
/api/time-blocks       → nested auth per method
/api/users/:id         → authenticateToken only; mounts reservations and appointments
  /:id/reservations    → backend/backend/src/routes/reservations.js
  /:id/appointments    → backend/backend/src/routes/appointments.js
/api/admin             → authenticateToken + inline role check in each controller
```

**Key design decisions:**

- The JWT payload stores `role` in **lowercase** (`jwt.sign({ id, role: user.role.toLowerCase() })`). The `authorizeRole` middleware in `backend/src/middlewares/auth.js` compares lowercased roles, so all route-level `authorizeRole` calls use lowercase strings (e.g., `['doctor', 'admin']`).
- **Two `authorizeRole` implementations exist**: `backend/src/middlewares/auth.js` exports one that lowercases before comparing (used everywhere in routes). `backend/src/middlewares/authorizeRole.js` is a standalone file that does NOT lowercase — it is not imported by any current route and should not be used.
- The **admin router** (`backend/src/routes/admin.js`) does NOT call `authorizeRole` — each controller function does its own `req.user.role?.toLowerCase() !== 'admin'` check inline.
- **Reservations and Appointments share the same Prisma model** (`Appointment`). "Reservation" is the creation flow (patient books a time block); "appointment" is the management flow (doctor/admin update status). Both route groups hit the same table.
- `reservationService.createReservation` runs under `Serializable` isolation to prevent double-booking of a `TimeBlock` (1:1 constraint enforced at both DB and service level).
- **Soft delete for users**: `deletedAt` field. `adminService.getUsersService` filters `{ deletedAt: null }`. Login silently rejects soft-deleted users with the same error as wrong credentials.
- **Doctor identity injection in routes**: when a `doctor` calls `POST /api/time-blocks`, the route middleware sets `req.body.doctorId = req.user.id` before calling the controller. The controller trusts `req.body.doctorId` directly.
- `auditMiddleware` hooks into `res.on('finish')` and never throws — `logAudit` swallows its own errors and returns false. Audit failures are non-fatal.

## Key Conventions

**Adding a new route group:**

1. Create `backend/src/routes/myResource.js` — compose `authenticateToken`, `authorizeRole(['role'])`, `validate(schema)`, `auditMiddleware('label')`, then controller.
2. Create `backend/src/controllers/myResourceController.js` — thin: parse req, call service, return JSON. Error handling: `try/catch` calling `next(error)` (preferred) or inline `res.status(N).json(...)`.
3. Create `backend/src/services/myResourceService.js` — all business logic and Prisma queries here. Use `prisma.$transaction` for any multi-step writes.
4. Register the router in `backend/src/routes/index.js`.

**Schemas** live in `backend/src/schemas/`. Pass Joi schemas to `validate(schema)`. For role-conditional validation (e.g., `doctorId` required only for admin), use `validate(schema, { context: { role: (req) => req.user.role } })` and reference `Joi.ref('$role')` in the schema.

**Controller error handling**: use `next(error)` so the global `errorHandler` handles it. Only use inline `res.status(N).json(...)` for predictable domain errors (404, 409). The `errorHandler` reads `err.status` if set.

**Prisma client**: singleton at `backend/src/utils/prismaClient.js`. Import it in services, not in controllers.

**Audit**: call `auditMiddleware('Human readable label')` on every protected route. For service-level audit (auth flows), call `logAudit(userId, action)` directly from the service.

## Environment Variables

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes | Required at runtime (enforced by P3 env validation) |
| `PORT` | No | Defaults to 3006 in `backend/src/server.js` |
| `SALT_ROUNDS` | No | Defaults to 10 in `authService.js` |
| `NODE_ENV` | No | `development` by default |

`JWT_SECRET` lives in `backend/.env.example` and is required at runtime — `backend/src/middlewares/auth.js` calls `jwt.verify(..., process.env.JWT_SECRET)` directly.
