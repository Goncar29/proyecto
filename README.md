# API para Citas Médicas

Este proyecto es una API y aplicación web para la gestión de citas médicas, desarrollada con **Express.js**, **Prisma ORM**, **PostgreSQL** y **EJS** para vistas. Incluye autenticación JWT, control de roles (usuario/admin), validaciones, y manejo de reservas y bloques de tiempo.

## Características principales

- Registro y login de usuarios con roles (USER, ADMIN)
- Gestión de usuarios, reservas y bloques de tiempo
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

🧑‍⚕️ Autenticación

- `POST /api/auth/register` → Registro de un nuevo usuario.
- `POST /api/auth/login` → Inicio de sesión y obtención de token JWT.

🧑‍⚕️ Usuarios

- `GET /api/users` → listado de usuarios (solo admin).
- `GET /api/users/:id` → detalle de un usuario (admin o el propio usuario).
- `PUT /api/users/:id` → actualizar datos de un usuario (admin o el propio usuario).
- `DELETE /api/users/:id` → eliminar un usuario (solo admin).
- `GET /api/users/:id/appointments` → listar citas de un usuario (según rol).
- `GET /api/users/:id/reservations` → listar reservas de un usuario (según rol).

🕒 Time Blocks

- `POST /api/time-blocks` → Creación de un nuevo bloque de tiempo (requiere rol doctor o admin).
- `GET /api/time-blocks` → Obtención de todos los bloques de tiempo (requiere rol doctor o admin).
- `GET /api/time-blocks/:id` → Obtención de un bloque de tiempo específico.
- `PUT /api/time-blocks/:id` → Actualización de un bloque de tiempo (requiere rol doctor o admin).
- `DELETE /api/time-blocks/:id` → Eliminación de un bloque de tiempo (requiere rol doctor o admin).

📅 Reservas

-`POST /api/reservations` → Creación de una nueva reserva (requiere rol patient).
-`GET /api/reservations` → Obtención de todas las reservas (requiere rol doctor o admin).
-`GET /api/reservations/:id` → Obtención de una reserva específica.
-`PUT /api/reservations/:id` → Actualización de una reserva (requiere rol doctor o admin).
-`DELETE /api/reservations/:id` → Eliminación de una reserva (requiere rol doctor o admin).

## 🔐 Autenticación y Roles

El sistema implementa autenticación mediante JWT y roles de usuario:

Roles disponibles:

- admin: Acceso completo a todos los endpoints y recursos.
- doctor: Crear/editar/eliminar sus propios time-blocks, ver reservas asignadas
- patient: Crear reservas para bloques disponibles, ver sus propias reservas.

Endpoints protegidos: Se requiere un token JWT válido en el encabezado Authorization para acceder a rutas protegidas.

## Tecnologías utilizadas

- Node.js: Entorno de ejecución de JavaScript.
- Express: Framework web para Node.js.
- Prisma: ORM para interactuar con la base de datos.
- PostgreSQL.
- Joi: Biblioteca para validaciones de datos.
- JWT (JSON Web Tokens): Autenticación y autorización de usuarios.
- bcryptjs

## ✅ Validaciones

Se utilizan esquemas de validación con Joi para asegurar la integridad de los datos:

createTimeBlockSchema: Validación para la creación de bloques de tiempo.

updateTimeBlockSchema: Validación para la actualización de bloques de tiempo.

createReservationSchema: Validación para la creación de reservas.

updateReservationSchema: Validación para la actualización de reservas.

## 🧪 Pruebas

- Se recomienda usar Postman o Insomnia para probar todos los endpoints.
- Recuerda enviar siempre el token JWT en Authorization: Bearer <token>.
- Verificar permisos según el rol del usuario para cada endpoint.

## Notas

- El cliente Prisma se genera en `generated/prisma`.
- El archivo `.env` debe contener la variable `JWT_SECRET` y la cadena de conexión de la base de datos.
- Para desarrollo local, puedes usar los servicios de Docker Compose incluidos.

---

**Licencia:** MIT

