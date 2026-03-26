# API para Citas Médicas

Este proyecto es una API y aplicación web para la gestión de citas médicas, desarrollada con **Express.js**, **Prisma ORM**, **PostgreSQL** y **EJS** para vistas. Incluye autenticación JWT, control de roles (patient/doctor/admin), validaciones, y manejo de reservas y bloques de tiempo.

## Características principales

- Registro y login de usuarios con roles (PATIENT, DOCTOR, ADMIN)
- Gestión de usuarios, reservas, citas y bloques de tiempo
- Validación de datos con Joi
- Autenticación y autorización con JWT
- Vistas con EJS y estilos CSS
- Base de datos PostgreSQL gestionada con Prisma ORM
- Docker Compose para entorno de desarrollo

## 🛠 Instalación y uso

1. **Clona el repositorio y entra al directorio:**
   ```bash
   git clone https://github.com/Goncar29/proyecto.git
   cd proyecto
   ```
2. **Copia el archivo de variables de entorno y configúralo:**
   ```bash
   cp .env.example .env
   # Edita .env con tus valores
   ```
3. **Instala las dependencias:**
   ```bash
   npm install
   ```
4. **Aplica las migraciones y genera el cliente Prisma:**
   ```bash
   npx prisma migrate dev
   npx prisma generate
   ```
5. **(Opcional) Ejecuta el seed para datos de ejemplo:**
   ```bash
   node prisma/seed.js
   ```
6. **Inicia la aplicación:**
   ```bash
   npm run dev
   # o
   npm start
   ```

## Endpoints principales

> ⚠️ Todos los endpoints protegidos requieren el header `Authorization: Bearer <token>`

### 🧑‍⚕️ Autenticación

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/register` | Registro de un nuevo usuario | No |
| POST | `/api/auth/login` | Inicio de sesión y obtención de token JWT | No |

### 👥 Usuarios

| Método | Endpoint | Descripción | Roles |
|--------|----------|-------------|-------|
| GET | `/api/users` | Listado de usuarios | admin |
| GET | `/api/users/:id` | Detalle de un usuario | admin, propio |
| PUT | `/api/users/:id` | Actualizar datos de un usuario | admin, propio |
| DELETE | `/api/users/:id` | Eliminar un usuario | admin |
| GET | `/api/users/:id/appointments` | Listar citas de un usuario | admin, propio |
| GET | `/api/users/:id/reservations` | Listar reservas de un usuario | admin, propio |

### 🕒 Time Blocks (Bloques de tiempo)

| Método | Endpoint | Descripción | Roles |
|--------|----------|-------------|-------|
| GET | `/api/time-blocks` | Listar todos los bloques | patient, doctor, admin |
| GET | `/api/time-blocks/:id` | Detalle de un bloque | patient, doctor, admin |
| POST | `/api/time-blocks` | Crear un nuevo bloque | doctor, admin |
| PUT | `/api/time-blocks/:id` | Actualizar un bloque | doctor, admin |
| DELETE | `/api/time-blocks/:id` | Eliminar un bloque | doctor, admin |

### 📅 Appointments (Citas)

| Método | Endpoint | Descripción | Roles |
|--------|----------|-------------|-------|
| GET | `/api/appointments` | Listar todas las citas | patient, doctor, admin |
| GET | `/api/appointments/:id` | Detalle de una cita | patient, doctor, admin |
| POST | `/api/appointments` | Crear una nueva cita | patient, admin |
| PUT | `/api/appointments/:id` | Actualizar/confirmar/cancelar cita | doctor, admin |
| DELETE | `/api/appointments/:id` | Eliminar una cita | admin |

### 📋 Reservas

| Método | Endpoint | Descripción | Roles |
|--------|----------|-------------|-------|
| POST | `/api/reservations` | Crear una nueva reserva | patient, admin |
| GET | `/api/reservations` | Listar todas las reservas | doctor, admin |
| GET | `/api/reservations/:id` | Detalle de una reserva | doctor, admin |
| PUT | `/api/reservations/:id` | Actualizar una reserva | patient, doctor, admin |
| DELETE | `/api/reservations/:id` | Eliminar una reserva | admin |

## 🔐 Autenticación y Roles

El sistema implementa autenticación mediante JWT y control de acceso basado en roles (RBAC).

### Roles disponibles

| Rol | Descripción |
|-----|-------------|
| `admin` | Acceso completo a todos los endpoints y recursos |
| `doctor` | Crear/editar/eliminar sus propios time-blocks, ver y gestionar reservas y citas |
| `patient` | Crear reservas para bloques disponibles, ver sus propias citas |

### Flujo de trabajo

1. **Registro/Login** → Obtener token JWT
2. **Paciente**: Ve time-blocks disponibles → Crea reserva
3. **Doctor**: Ve reservas de sus pacientes → Gestiona citas
4. **Admin**: Acceso total al sistema

## Tecnologías utilizadas

- **Node.js**: Entorno de ejecución de JavaScript
- **Express**: Framework web para Node.js
- **Prisma**: ORM para interactuar con la base de datos
- **PostgreSQL**: Base de datos relacional
- **Joi**: Biblioteca para validaciones de datos
- **JWT**: Autenticación y autorización de usuarios
- **bcryptjs**: Hashing de contraseñas
- **EJS**: Motor de plantillas para vistas

## ✅ Validaciones

Se utilizan esquemas de validación con Joi para asegurar la integridad de los datos:

- `createTimeBlockSchema`: Validación para la creación de bloques de tiempo
- `updateTimeBlockSchema`: Validación para la actualización de bloques de tiempo
- `createReservationSchema`: Validación para la creación de reservas
- `updateReservationSchema`: Validación para la actualización de reservas
- `createAppointmentSchema`: Validación para la creación de citas
- `updateAppointmentSchema`: Validación para la actualización de citas

## 🧪 Pruebas

- Se recomienda usar Postman o Insomnia para probar todos los endpoints
- Recuerda enviar siempre el token JWT en `Authorization: Bearer <token>`
- Verificar permisos según el rol del usuario para cada endpoint

## Notas

- El cliente Prisma se genera en `generated/prisma`
- El archivo `.env` debe contener la variable `JWT_SECRET` y la cadena de conexión de la base de datos
- Para desarrollo local, puedes usar los servicios de Docker Compose incluidos
- El rol por defecto al registrar un nuevo usuario es `PATIENT`

---

**Licencia:** MIT
