# MediConnect

Plataforma de turnos médicos online. Pacientes buscan doctores, consultan disponibilidad y reservan citas desde un calendario interactivo. Doctores gestionan su agenda y perfil profesional. Administradores controlan usuarios, bloques de tiempo y auditoría.

**Demo en vivo**: https://mediconnect-eight-sage.vercel.app

---

## Características

### Pacientes
- Registro, login y recuperación de contraseña por email (token de un solo uso, 30 min)
- Búsqueda de doctores por nombre o especialidad (debounce 300 ms)
- Perfil completo del doctor: bio, especialidades, hospital, calificación promedio
- Calendario interactivo de turnos disponibles por mes
- Reserva de citas con motivo opcional
- Cancelación y reprogramación de citas
- Dashboard con tabs Próximas / Historial y filtro por estado
- Calificaciones y reseñas post-consulta (1–5 estrellas + comentario)
- Votar reseñas como útiles o no útiles (toggle)
- Cambio de contraseña y foto de perfil

### Doctores
- Edición de perfil profesional (bio, especialidades, hospital, localización)
- Subir foto de perfil (Cloudinary, JPG/PNG/WebP, máx 5 MB)
- Confirmación y cierre de citas

### Administradores
- Gestión de usuarios: activar, suspender, desactivar, promover a doctor
- Creación de bloques de tiempo individuales y en masa (bulk)
- Vista de todas las reservas
- Registro de auditoría con filtro por acción
- Eliminación de citas

### Sistema
- Recordatorios automáticos por email 24 h antes de cada cita (cron job idempotente)
- Email de confirmación al reservar
- Paginación server-side en todas las listas
- Rate limiting por endpoint: global (100/15 min), auth (20/15 min), recuperación de contraseña (5/1 h)
- Logs estructurados con Pino
- Documentación Swagger en `/api/docs`

---

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | React 19, TypeScript, Vite 8, Tailwind CSS 4 |
| Router | React Router v7 |
| Backend | Node.js 22, Express 5 |
| ORM | Prisma 6 |
| Base de datos | PostgreSQL (Neon en producción) |
| Auth | JWT (15 min) + Refresh Token rotativo (httpOnly cookie, sha256 en DB) |
| Uploads | Cloudinary |
| Email | Resend |
| Validación | Joi (backend), TypeScript strict (frontend) |
| Logs | Pino |
| Cron | node-cron |
| Tests backend | Jest 30 + Supertest |
| Tests frontend | Vitest 4 + Testing Library |
| Deploy frontend | Vercel |
| Deploy backend | Render (Docker free tier) |
| CI/CD | GitHub Actions |

---

## Requisitos previos

- Node.js 22+
- npm 10+
- PostgreSQL local o cuenta en [Neon](https://neon.tech)
- Cuenta en [Cloudinary](https://cloudinary.com) (uploads de fotos)
- Cuenta en [Resend](https://resend.com) (emails — opcional en desarrollo)

---

## Setup local

### 1. Clonar e instalar

```bash
git clone https://github.com/Goncar29/proyecto.git
cd proyecto
npm install
```

### 2. Variables de entorno — backend

Crear `backend/.env`:

```env
# Base de datos
DATABASE_URL="postgresql://usuario:password@localhost:5432/mediconnect"

# JWT
JWT_SECRET="un-secreto-largo-y-aleatorio"
JWT_EXPIRES_IN="15m"
REFRESH_TOKEN_SECRET="otro-secreto-diferente"

# Servidor
PORT=3006
NODE_ENV=development

# Seguridad
SALT_ROUNDS=10
UPLOAD_MAX_BYTES=5242880

# Cloudinary
CLOUDINARY_CLOUD_NAME="tu-cloud-name"
CLOUDINARY_API_KEY="tu-api-key"
CLOUDINARY_API_SECRET="tu-api-secret"

# Email (Resend)
RESEND_API_KEY="re_xxxxxxxxxxxx"
EMAIL_FROM="MediConnect <noreply@tudominio.com>"

# App
APP_URL="http://localhost:5173"
CORS_ORIGIN="http://localhost:5173"
```

### 3. Variables de entorno — frontend

Crear `frontend/.env`:

```env
VITE_API_URL=http://localhost:3006
```

> En desarrollo el frontend usa el proxy de Vite (`vite.config.ts`), no la variable directamente. La variable aplica en producción.

### 4. Base de datos

```bash
cd backend

# Crear tablas
npx prisma migrate dev

# Cargar datos de demo (1 admin, 2 pacientes, 6 doctores, 688 bloques, 15 reseñas)
npx prisma db seed
```

### 5. Iniciar en desarrollo

```bash
# Terminal 1 — Backend (puerto 3006, hot-reload)
npm run dev

# Terminal 2 — Frontend (puerto 5173, HMR)
npm run dev:frontend
```

Abrir http://localhost:5173

---

## Scripts disponibles

| Script | Descripción |
|--------|-------------|
| `npm run dev` | Backend con hot-reload (`node --watch`) |
| `npm run dev:frontend` | Frontend con HMR (Vite) |
| `npm test` | Suite completa de tests backend (246 tests, ~22 s) |
| `npm run test:frontend` | Tests del frontend (Vitest) |
| `npm run build` | Build de producción del frontend |
| `cd backend && npx jest --runInBand tests/auth.test.js` | Un solo archivo de test |
| `cd backend && npm run test:coverage` | Tests con reporte de cobertura |
| `cd backend && npx prisma studio` | Interfaz visual de la base de datos |
| `cd backend && npx prisma migrate dev --name <nombre>` | Nueva migración |

---

## Credenciales de demo

El seed carga los siguientes usuarios con contraseña `password123`:

| Rol | Email |
|-----|-------|
| Admin | admin@mediconnect.test |
| Paciente | paciente1@mediconnect.test |
| Paciente | paciente2@mediconnect.test |
| Doctor | julian.ortiz@mediconnect.test |
| Doctor | carolina.mendez@mediconnect.test |
| Doctor | lucia.fernandez@mediconnect.test |
| Doctor | valeria.castro@mediconnect.test |
| Doctor | sebastian.rojas@mediconnect.test |
| Doctor | mariano.pereira@mediconnect.test |

---

## API Reference

> Base URL local: `http://localhost:3006/api`  
> Swagger UI: `http://localhost:3006/api/docs`  
> Endpoints protegidos requieren: `Authorization: Bearer <token>`

### Auth — `/api/auth`

| Método | Endpoint | Auth | Descripción |
|--------|----------|------|-------------|
| POST | `/register` | ❌ | Registro de paciente |
| POST | `/login` | ❌ | Login — devuelve JWT + refresh token (cookie) |
| POST | `/refresh` | cookie | Rotar refresh token |
| POST | `/logout` | ✅ | Revocar refresh token |
| GET | `/me` | ✅ | Datos del usuario autenticado |
| POST | `/forgot-password` | ❌ | Enviar email de recuperación |
| POST | `/reset-password` | ❌ | Cambiar contraseña con token (single-use, 30 min) |

### Doctores públicos — `/api/public/doctors`

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/` | Listar doctores — params: `q`, `specialty`, `location`, `page`, `pageSize` |
| GET | `/:id` | Perfil completo del doctor |
| GET | `/:id/reviews` | Reseñas paginadas |
| GET | `/:id/availability` | Bloques disponibles — params: `from`, `to` |

### Citas — `/api/appointments`

| Método | Endpoint | Roles | Descripción |
|--------|----------|-------|-------------|
| GET | `/` | paciente/doctor/admin | Mis citas (filtradas por rol) |
| POST | `/` | paciente | Reservar cita |
| PATCH | `/:id/cancel` | paciente/doctor/admin | Cancelar cita |
| PATCH | `/:id/confirm` | doctor/admin | Confirmar cita |
| PATCH | `/:id/complete` | doctor/admin | Completar cita |
| PUT | `/:id` | paciente | Reprogramar cita |
| DELETE | `/:id` | admin | Eliminar cita |

### Doctores — `/api/doctors`

| Método | Endpoint | Roles | Descripción |
|--------|----------|-------|-------------|
| PATCH | `/me/profile` | doctor | Editar perfil profesional |
| POST | `/me/photo` | doctor | Subir foto de perfil |
| POST | `/:id/reviews` | paciente | Crear reseña (requiere cita COMPLETED) |
| POST | `/:id/reviews/:reviewId/vote` | ✅ | Votar reseña (toggle útil/no útil) |
| GET | `/:id/reviews/:reviewId/my-vote` | ✅ | Consultar mi voto |

### Usuarios — `/api/users`

| Método | Endpoint | Roles | Descripción |
|--------|----------|-------|-------------|
| PUT | `/:id` | propio/admin | Actualizar nombre/email |
| PATCH | `/me/password` | ✅ | Cambiar contraseña |
| POST | `/me/photo` | ✅ | Subir foto de perfil |

### Admin — `/api/admin`

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/users` | Listar todos los usuarios |
| POST | `/users/:id/promote` | Promover usuario a doctor |
| PATCH | `/users/:id/status` | Activar o suspender usuario |
| GET | `/reservations` | Ver todas las citas |
| GET | `/time-blocks` | Listar bloques de tiempo |
| POST | `/time-blocks` | Crear bloque individual |
| POST | `/time-blocks/bulk` | Crear bloques en masa |
| DELETE | `/time-blocks/:id` | Eliminar bloque |
| GET | `/audit` | Logs de auditoría |

---

## Arquitectura

### Estructura del monorepo

```
mediconnect/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma        # 9 modelos
│   │   ├── seed.js              # Datos de demo
│   │   └── migrations/          # 15 migraciones históricas
│   ├── src/
│   │   ├── app.js               # Express app + middleware stack
│   │   ├── server.js            # HTTP server + cron job
│   │   ├── config/              # env.js, swagger.js, index.js
│   │   ├── controllers/         # Handlers por recurso
│   │   ├── docs/                # swaggerDocs.js
│   │   ├── jobs/
│   │   │   └── reminderJob.js   # Cron: recordatorios 24h antes de citas
│   │   ├── middlewares/
│   │   │   ├── auth.js          # authenticateToken + authorizeRole
│   │   │   ├── errorHandler.js  # Handler global con mapeo de errores Prisma
│   │   │   ├── logger.js        # Pino request logger
│   │   │   ├── timeout.js       # 30s request timeout
│   │   │   ├── uploadImage.js   # Multer en memoria (max 5MB)
│   │   │   └── validate.js      # Joi middleware
│   │   ├── routes/              # auth, admin, users, doctors,
│   │   │                        # publicDoctors, appointments, timeBlocks
│   │   ├── schemas/             # Joi schemas por recurso
│   │   ├── services/
│   │   │   ├── appointmentService.js
│   │   │   ├── authService.js
│   │   │   ├── userService.js
│   │   │   ├── adminService.js
│   │   │   ├── doctorProfileService.js
│   │   │   ├── reviewsService.js
│   │   │   ├── reviewVoteService.js
│   │   │   ├── publicDoctorsService.js
│   │   │   ├── passwordResetService.js
│   │   │   ├── audit.js         # logAudit + auditMiddleware
│   │   │   └── paginate.js      # Paginación server-side
│   │   └── utils/
│   │       ├── prismaClient.js
│   │       ├── cloudinary.js    # uploadBuffer(buffer, folder, opts?)
│   │       ├── email.js         # Resend: reset, confirmación, recordatorio
│   │       ├── logger.js        # Pino instance
│   │       └── validations.js
│   └── tests/                   # 246 tests en 28 suites
│       └── helpers/
│           └── setupUsers.js    # createTestUsers / deleteTestUsers
├── frontend/
│   └── src/
│       ├── api/
│       │   └── client.ts        # HTTP client con auto-refresh de JWT
│       ├── components/
│       │   ├── UserAvatar.tsx   # Foto o iniciales (sm/md/lg)
│       │   ├── ProtectedRoute.tsx
│       │   ├── AvailabilityCalendar.tsx
│       │   ├── ReschedulePicker.tsx
│       │   ├── ReviewForm.tsx
│       │   ├── Skeleton.tsx
│       │   ├── Layout.tsx
│       │   └── admin/           # AuditLogsPanel, BulkTimeBlocksModal,
│       │                        # ReservationsPanel, TimeBlocksPanel
│       ├── context/
│       │   ├── AuthContext.tsx
│       │   ├── ToastContext.tsx
│       │   └── ThemeContext.tsx
│       └── pages/
│           ├── Home.tsx
│           ├── Login.tsx
│           ├── Register.tsx
│           ├── ForgotPassword.tsx
│           ├── ResetPassword.tsx
│           ├── Doctors.tsx
│           ├── DoctorDetail.tsx
│           ├── Dashboard.tsx
│           ├── Settings.tsx
│           └── Admin.tsx
├── render.yaml                  # Config de deploy en Render
├── package.json                 # Workspace raíz (npm workspaces)
├── CLAUDE.md                    # Guía técnica para Claude Code
└── README.md                    # Este archivo
```

### Modelos de datos

```
User (ADMIN | DOCTOR | PATIENT)
 ├── DoctorProfile (1:1, solo doctors)
 │    └── Review[] (reseñas recibidas)
 │         └── ReviewVote[] (votos por reseña)
 ├── Appointment[] (como paciente)
 ├── Appointment[] (como doctor)
 ├── TimeBlock[] (bloques que ofrece el doctor)
 ├── AuditLog[]
 ├── RefreshToken[]
 └── PasswordResetToken[]

TimeBlock (1:1) ←→ Appointment (1:1) ←→ Review
```

### Flujo de autenticación

```
POST /auth/login
  ↓
JWT (15 min, en Authorization header)
  +
Refresh Token → sha256 guardado en DB → plaintext en cookie httpOnly
  ↓
Cada request autenticado → DB lookup (detecta suspended/deleted/inactive)
  ↓
JWT vencido → interceptor frontend → POST /auth/refresh → rota ambos tokens → reintenta
  ↓
Logout → revoca refresh token en DB
```

### Flujo de reserva

```
Paciente elige TimeBlock en calendario
  ↓
POST /api/appointments
  ↓
prisma.$transaction (SERIALIZABLE):
  1. Verificar TimeBlock libre
  2. Crear Appointment (PENDING)
  ↓
Email de confirmación (fire-and-forget)
  ↓
Doctor confirma → CONFIRMED
  ↓
Cron job (cada hora): date < 24h y reminderSentAt = null → email + seta reminderSentAt
  ↓
Doctor completa → COMPLETED → paciente puede dejar reseña
```

---

## Deploy

### Infraestructura de producción

| Servicio | Plataforma | Notas |
|---------|-----------|-------|
| Frontend | Vercel (free) | Auto-deploy en push a `main` |
| Backend | Render (Docker, free) | Deploy vía GitHub Actions + deploy hook |
| Base de datos | Neon PostgreSQL | Connection pooling activo |
| Uploads | Cloudinary | Un slot por usuario (overwrite), no-determinístico para doctors |
| Email | Resend | Dominio verificado requerido |
| Keep-alive | UptimeRobot | Ping a `/health` cada 14 min (evita cold start en free tier) |

### CI/CD

- **Push a `main` con cambios en `frontend/**`** → Vercel redeploya automáticamente.
- **Push a `main` con cambios en `backend/**`** → GitHub Actions dispara el deploy hook de Render.

### Variables de entorno en producción

**Render** (configurar en el dashboard o en `render.yaml`):

```
NODE_ENV=production
PORT=3006
DATABASE_URL
JWT_SECRET
JWT_EXPIRES_IN
REFRESH_TOKEN_SECRET
CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET
RESEND_API_KEY
EMAIL_FROM
CORS_ORIGIN     # URL de Vercel (ej: https://mediconnect-eight-sage.vercel.app)
APP_URL         # Misma URL (para links en emails)
```

**Vercel** (configurar en el dashboard):

```
VITE_API_URL    # URL del backend en Render
```

---

## Tests

```bash
# Todos los tests (246 tests, ~22 s)
npm test

# Con cobertura
cd backend && npm run test:coverage

# Un archivo específico
cd backend && npx jest --runInBand tests/reviews.test.js
```

Los tests corren contra la DB real. Requiere `DATABASE_URL` configurado. Cada suite crea y limpia sus propios datos. **Nunca correr en paralelo** — `--runInBand` es obligatorio.

**Suites disponibles:**

| Archivo | Qué cubre |
|---------|-----------|
| `auth.test.js` | Registro, login, validaciones |
| `authMe.test.js` | GET /auth/me |
| `authorization.test.js` | Acceso por rol |
| `hardening.test.js` | Edge cases de seguridad |
| `appointmentCancel.test.js` | Cancelación de citas |
| `appointmentsList.test.js` | Listado de citas |
| `appointmentReschedule.test.js` | Reprogramación |
| `appointmentStateTransitions.test.js` | Estados: PENDING→CONFIRMED→COMPLETED |
| `appointmentUpdateDelete.test.js` | PUT y DELETE admin |
| `timeBlocks.test.js` | CRUD bloques de tiempo |
| `bulkTimeBlocks.test.js` | Creación en masa |
| `adminUsers.test.js` | Gestión de usuarios |
| `promoteDoctor.test.js` | Promoción a doctor |
| `reviews.test.js` | CRUD reseñas + avgRating |
| `reviewVote.test.js` | Toggle de votos |
| `doctorPhoto.test.js` | Upload a Cloudinary |
| `publicDoctors.test.js` | Búsqueda y disponibilidad |
| `changePassword.test.js` | Cambio de contraseña |
| `passwordReset.test.js` | Recuperación por email |
| `refreshToken.test.js` | Rotación de tokens |
| `middleware.test.js` | Validación, errores |
| `seed.test.js` | Integridad del seed |

---

## Licencia

MIT — [Carlos Gonzalez](mailto:carlosngonzalez0@gmail.com)
