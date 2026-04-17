# MediConnect — Plataforma de Turnos Médicos

Aplicación full-stack para la gestión de turnos médicos. Permite a pacientes buscar doctores, reservar turnos desde un calendario interactivo y administrar sus citas. Incluye panel de administración y sistema de reviews.

## Stack

| Capa | Tecnología |
|------|------------|
| Backend | Node.js + Express 5, Prisma ORM, PostgreSQL |
| Frontend | Vite + React 19 + TypeScript, Tailwind CSS v4 |
| Auth | JWT (roles: PATIENT, DOCTOR, ADMIN) |
| Validación | Joi (backend), TypeScript (frontend) |
| Storage | Cloudinary (fotos de perfil de doctores) |
| Deploy | Docker multi-stage + docker-compose |

## Estructura del monorepo

```
/
├── backend/        @mediconnect/backend — API REST + Prisma
├── frontend/       @mediconnect/frontend — SPA React
├── Dockerfile      Build multi-stage (frontend → backend sirve el dist)
└── docker-compose.yml
```

## Instalación local

```bash
# 1. Clonar e instalar
git clone https://github.com/Goncar29/proyecto.git
cd proyecto
npm install

# 2. Variables de entorno (en la raíz)
cp backend/.env.example .env
# Editar .env: DATABASE_URL, JWT_SECRET, PORT (default 3006)

# 3. Migraciones y seed
cd backend
npx prisma migrate dev
npx prisma generate
npx prisma db seed
cd ..

# 4. Levantar todo
npm run dev:backend    # http://localhost:3006
npm run dev:frontend   # http://localhost:5173 (proxy → backend)
```

## Scripts

| Script | Descripción |
|--------|-------------|
| `npm run dev:backend` | Backend con hot-reload |
| `npm run dev:frontend` | Frontend con HMR |
| `npm run test` | Tests del backend (Jest + Supertest) |
| `npm run build` | Build de producción del frontend |

## Docker

```bash
docker-compose up --build
# App en http://localhost:3006
# PostgreSQL en localhost:5432
```

## Funcionalidades

### Para pacientes
- Registro y login
- Búsqueda de doctores en tiempo real (por nombre o especialidad, debounce 300ms)
- Calendario interactivo de disponibilidad por mes
- Reserva de turnos con motivo opcional
- Dashboard con citas activas y posibilidad de cancelar
- Sistema de reviews con rating (1–5 estrellas)
- Votar reviews de otros pacientes (👍 útil / 👎 no útil) con toggle

### Para doctores
- Ver turnos reservados y confirmar o cancelar citas
- Editar perfil profesional (bio, hospital, ubicación, especialidades)
- Subir foto de perfil (Cloudinary, JPG/PNG/WebP, máx 5 MB)

### Para administradores
- Panel con tabs: Usuarios / Reservaciones / Bloques de tiempo / Auditoría
- Ver todas las reservaciones con filtros por estado y búsqueda
- Crear y eliminar bloques de disponibilidad por doctor
- Ver y gestionar usuarios (activar/suspender/eliminar)
- Log de auditoría paginado y filtrable

## API

> Base URL: `http://localhost:3006/api`  
> Swagger UI: `http://localhost:3006/api/docs`  
> Endpoints protegidos requieren: `Authorization: Bearer <token>`

### Auth — `/api/auth`

| Método | Endpoint | Auth |
|--------|----------|------|
| POST | `/auth/register` | No |
| POST | `/auth/login` | No |
| GET | `/auth/me` | JWT |
| POST | `/auth/forgot-password` | No — respuesta genérica (enumeration prevention) |
| POST | `/auth/reset-password` | No — token single-use, TTL 30 min |

### Doctores públicos — `/api/public/doctors`

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/` | Listado con filtros (`q`, `specialty`, `location`, `availability`) |
| GET | `/:id` | Detalle del doctor |
| GET | `/:id/availability` | Turnos disponibles (`from`, `to`) |
| GET | `/:id/reviews` | Reviews paginadas |

### Usuarios — `/api/users`

| Método | Endpoint | Roles |
|--------|----------|-------|
| GET | `/:id/appointments` | propio, admin |
| POST | `/:id/reservations` | patient |
| PATCH | `/appointments/:id/cancel` | propio |
| POST | `/appointments/:id/reviews` | patient |

### Doctores — `/api/doctors`

| Método | Endpoint | Roles |
|--------|----------|-------|
| PATCH | `/me/profile` | doctor |
| POST | `/me/photo` | doctor — multipart, sube foto a Cloudinary |
| POST | `/:id/reviews` | patient |
| POST | `/:id/reviews/:reviewId/vote` | patient — toggle 1/-1 |
| GET | `/:id/reviews/:reviewId/my-vote` | patient |

### Admin — `/api/admin`

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/users` | Listar usuarios |
| PATCH | `/users/:id/status` | Activar/suspender |
| DELETE | `/users/:id` | Soft-delete |
| GET | `/reservations` | Listar todas las reservaciones |
| GET | `/time-blocks` | Listar bloques |
| POST | `/time-blocks` | Crear bloque |
| DELETE | `/time-blocks/:id` | Eliminar bloque |
| GET | `/audit` | Logs de auditoría |

## Diseño y decisiones técnicas

- **JWT con roles en lowercase**: el payload guarda `role` en minúsculas; el middleware `authorizeRole` compara en lowercase
- **Reservas bajo transacción Serializable**: previene double-booking del mismo bloque
- **Soft delete de usuarios**: campo `deletedAt`; el login rechaza usuarios eliminados
- **`Appointment` unifica reserva y cita**: mismo modelo Prisma, distintos flujos de ruta
- **Frontend en producción**: el backend sirve el `dist/` de React como archivos estáticos; SPA fallback con `{*path}`
- **Búsqueda OR**: `q=` busca en nombre del doctor y especialidad simultáneamente

## Variables de entorno

| Variable | Requerida | Default |
|----------|-----------|---------|
| `DATABASE_URL` | Sí | — |
| `JWT_SECRET` | Sí | — |
| `PORT` | No | `3006` |
| `SALT_ROUNDS` | No | `10` |
| `NODE_ENV` | No | `development` |
| `CLOUDINARY_CLOUD_NAME` | Sí (upload fotos) | — |
| `CLOUDINARY_API_KEY` | Sí (upload fotos) | — |
| `CLOUDINARY_API_SECRET` | Sí (upload fotos) | — |
| `UPLOAD_MAX_BYTES` | No | `5242880` (5 MB) |

---

**Licencia:** MIT
