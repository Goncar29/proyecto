# API para Citas Médicas

Este proyecto es una API para la gestión de citas médicas, desarrollada con **Express.js**, **Prisma ORM** y **PostgreSQL**. Incluye autenticación JWT, control de roles (patient/doctor/admin), validaciones con Joi, y manejo de reservas y bloques de tiempo.

## Características principales

- Registro y login de usuarios con roles (PATIENT, DOCTOR, ADMIN)
- Gestión de usuarios, reservas, citas y bloques de tiempo
- Validación de datos con Joi
- Autenticación y autorización con JWT
- Base de datos PostgreSQL gestionada con Prisma ORM
- Índices de rendimiento en base de datos
- Graceful shutdown para conexiones de base de datos
- Auditoría de acciones sensibles

## 🛠 Instalación y uso

1. **Clona el repositorio:**
   ```bash
   git clone https://github.com/Goncar29/proyecto.git
   cd proyecto
   ```
2. **Instala las dependencias:**
   ```bash
   npm install
   ```
3. **Configura el entorno:**
   ```bash
   cp .env.example .env
   # Edita .env con tus valores (DATABASE_URL, JWT_SECRET)
   ```
4. **Aplica las migraciones:**
   ```bash
   npx prisma migrate dev
   npx prisma generate
   ```
5. **Inicia la aplicación:**
   ```bash
   npm run dev
   ```

La API estará disponible en `http://localhost:3005`
Swagger UI (documentación visual): `http://localhost:3005/api/docs`

## 🔐 Autenticación

### Registro y Login

```bash
# Registrar usuario (rol por defecto: PATIENT)
curl -X POST http://localhost:3005/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name": "Juan Pérez", "email": "juan@email.com", "password": "password123"}'

# Login
curl -X POST http://localhost:3005/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "juan@email.com", "password": "password123"}'
```

**Response login:**
```json
{
  "message": "Inicio de sesión exitoso",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

> ⚠️ Usar el token en todos los requests: `Authorization: Bearer <token>`

### Roles del Sistema

| Rol | Descripción |
|-----|-------------|
| `PATIENT` | Paciente. Puede ver time-blocks, crear reservas y ver sus citas |
| `DOCTOR` | Doctor. Gestiona sus time-blocks, ve reservas de pacientes, gestiona citas |
| `ADMIN` | Administrador. Acceso total al sistema |

## 📋 Flujo de Trabajo

```
┌─────────────────────────────────────────────────────────────────┐
│                     FLUJO DE NEGOCIO                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. ADMIN crea time-blocks (disponibilidad del doctor)         │
│     → POST /api/admin/time-blocks                              │
│                                                                 │
│  2. PACIENTE ve time-blocks disponibles                        │
│     → GET /api/time-blocks                                     │
│                                                                 │
│  3. PACIENTE crea RESERVA (crea automáticamente la CITA)       │
│     → POST /api/users/:id/reservations                         │
│                                                                 │
│  4. DOCTOR ve reservas de sus pacientes                        │
│     → GET /api/users/:doctorId/reservations                    │
│                                                                 │
│  5. DOCTOR confirma/cancela la CITA                            │
│     → PUT /api/appointments/:id                                │
│                                                                 │
│  6. PACIENTE ve sus CITAS                                      │
│     → GET /api/users/:id/appointments                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Endpoints

> ⚠️ Todos los endpoints protegidos requieren: `Authorization: Bearer <token>`

### 🧑‍⚕️ Autenticación — `/api/auth`

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| POST | `/auth/register` | Registro de usuario (rol: PATIENT) | No |
| POST | `/auth/login` | Login, retorna JWT | No |

### 👥 Usuarios — `/api/users`

| Método | Endpoint | Descripción | Roles |
|--------|----------|-------------|-------|
| PUT | `/users/:id` | Actualizar usuario | admin, propio |
| GET | `/:id/appointments` | Ver citas del usuario | admin, propio |
| GET | `/:id/reservations` | Ver reservas del usuario | admin, propio |

### 🕒 Time Blocks — `/api/time-blocks`

| Método | Endpoint | Descripción | Roles |
|--------|----------|-------------|-------|
| GET | `/time-blocks` | Listar bloques disponibles | patient, doctor, admin |
| GET | `/time-blocks/:id` | Detalle de un bloque | patient, doctor, admin |
| POST | `/time-blocks` | Crear bloque | doctor, admin |
| PUT | `/time-blocks/:id` | Actualizar bloque | doctor, admin |
| DELETE | `/time-blocks/:id` | Eliminar bloque | doctor, admin |

### 📋 Reservas — `/api/users/:id/reservations`

> Las reservas se crean dentro del contexto de un usuario: `/api/users/:id/reservations`

| Método | Endpoint | Descripción | Roles |
|--------|----------|-------------|-------|
| POST | `/` | Crear reserva (crea CITA automáticamente) | patient, admin |
| GET | `/` | Ver reservas | doctor, admin |
| PUT | `/:reservationId` | Actualizar reserva | patient, doctor, admin |
| DELETE | `/:reservationId` | Eliminar reserva | admin |

### 📅 Citas — `/api/appointments`

| Método | Endpoint | Descripción | Roles |
|--------|----------|-------------|-------|
| GET | `/` | Ver citas (filtradas por rol) | patient, doctor, admin |
| GET | `/:id` | Detalle de cita | patient, doctor, admin |
| PUT | `/:id` | Confirmar/cancelar cita | doctor, admin |
| DELETE | `/:id` | Eliminar cita | admin |

### ⚙️ Admin — `/api/admin`

| Método | Endpoint | Descripción | Roles |
|--------|----------|-------------|-------|
| POST | `/time-blocks` | Crear time-block para doctor | admin |
| GET | `/reservations` | Ver todas las reservas | admin |
| GET | `/users` | Listar usuarios | admin |
| GET | `/users/:id` | Detalle de usuario | admin |
| PUT | `/users/:id` | Actualizar usuario | admin |
| PATCH | `/users/:id/status` | Activar/desactivar usuario | admin |
| GET | `/audit` | Ver logs de auditoría | admin |

## Ejemplo Completo

```bash
# 1. Registrar paciente
curl -X POST http://localhost:3005/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name": "María", "email": "maria@test.com", "password": "password123"}'

# 2. Login para obtener token
TOKEN=$(curl -s -X POST http://localhost:3005/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "maria@test.com", "password": "password123"}' | jq -r '.token')

# 3. Ver time-blocks disponibles
curl -X GET http://localhost:3005/api/time-blocks \
  -H "Authorization: Bearer $TOKEN"

# 4. Crear reserva
curl -X POST http://localhost:3005/api/users/1/reservations \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"doctorId": 1, "patientId": 1, "timeBlockId": 1, "reason": "Consulta general"}'

# 5. Ver citas del paciente
curl -X GET http://localhost:3005/api/users/1/appointments \
  -H "Authorization: Bearer $TOKEN"
```

## Tecnologías utilizadas

- **Node.js** + **Express**: Runtime y framework web
- **Prisma ORM**: ORM para PostgreSQL
- **JWT**: Autenticación stateless
- **Joi**: Validación de schemas
- **bcryptjs**: Hashing de contraseñas
- **swagger-ui-express**: Documentación de API

## Notas

- El rol por defecto al registrar es `PATIENT`
- Un time-block puede tener solo una cita asociada (relación 1:1)
- Los usuarios usan soft-delete (campo `deletedAt`)
- Las acciones sensibles se registran en `AuditLog`
- Requiere `npx prisma migrate dev` después de cambios en schema

---

**Licencia:** MIT
