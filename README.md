API para Citas Médicas
Este proyecto es una API y aplicación web para la gestión de citas médicas, desarrollada con Express.js, Prisma ORM, PostgreSQL y EJS para vistas. Incluye autenticación JWT, control de roles (usuario/admin), validaciones, y manejo de reservas y bloques de tiempo.

Características principales
Registro y login de usuarios con roles (USER, ADMIN)
Gestión de usuarios, reservas y bloques de tiempo
Validación de datos con Joi
Autenticación y autorización con JWT
Vistas con EJS y estilos CSS
Base de datos PostgreSQL gestionada con Prisma ORM
Docker Compose para entorno de desarrollo
Instalación y uso
Clona el repositorio y entra al directorio:
git clone <repo-url>
cd curso-expressjs
Copia el archivo de variables de entorno y configúralo:
cp .env.example .env
# Edita .env con tus valores
Instala las dependencias:
npm install
Levanta la base de datos con Docker Compose:
docker-compose up -d
Aplica las migraciones y genera el cliente Prisma:
npx prisma migrate dev
npx prisma generate
(Opcional) Ejecuta el seed para datos de ejemplo:
node prisma/seed.js
Inicia la aplicación:
npm run dev
# o
npm start
La app estará disponible en http://localhost:3005

Endpoints principales
POST /auth/register — Registro de usuario
POST /auth/login — Login y obtención de token JWT
GET /users/get — Listar usuarios (ADMIN)
PUT /users/update/:id — Actualizar usuario (ADMIN)
DELETE /users/delete/:id — Eliminar usuario (ADMIN)
POST /reservations — Crear reserva (USER/ADMIN)
GET /reservations/:id — Obtener reserva (USER/ADMIN)
PUT /reservations/:id — Actualizar reserva (USER/ADMIN)
DELETE /reservations/:id — Eliminar reserva (ADMIN)
POST /admin/time-blocks — Crear bloque de tiempo (ADMIN)
GET /admin/reservations — Listar todas las reservas (ADMIN)
Tecnologías utilizadas
Node.js, Express.js
Prisma ORM
PostgreSQL
Docker, Docker Compose
EJS
Joi
JWT
bcryptjs
Notas
El cliente Prisma se genera en generated/prisma.
El archivo .env debe contener la variable JWT_SECRET y la cadena de conexión de la base de datos.
Para desarrollo local, puedes usar los servicios de Docker Compose incluidos.
Licencia: MIT