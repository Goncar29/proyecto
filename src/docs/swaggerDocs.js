// src/docs/swaggerDoc.js  (reemplaza tu actual file por este)
module.exports = {
    openapi: '3.0.0',
    info: {
        title: 'API de Reservas Médicas',
        version: '1.1.0',
        description:
            'Documentación de la API para el sistema de gestión de citas médicas.\nIncluye autenticación, gestión de usuarios, bloques de tiempo, reservas y auditoría.',
    },
    servers: [
        {
            url: 'http://localhost:3005/api',
            description: 'Servidor local',
        },
    ],
    components: {
        securitySchemes: {
            bearerAuth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
            },
        },
        schemas: {
            User: {
                type: 'object',
                properties: {
                    id: { type: 'integer' },
                    name: { type: 'string' },
                    email: { type: 'string' },
                    role: { type: 'string', enum: ['admin', 'doctor', 'patient'] },
                },
            },
            TimeBlock: {
                type: 'object',
                properties: {
                    id: { type: 'integer' },
                    doctorId: { type: 'integer' },
                    startTime: { type: 'string', format: 'date-time' },
                    endTime: { type: 'string', format: 'date-time' },
                    available: { type: 'boolean' },
                },
            },
            Reservation: {
                type: 'object',
                properties: {
                    id: { type: 'integer' },
                    doctorId: { type: 'integer' },
                    patientId: { type: 'integer' },
                    timeBlockId: { type: 'integer' },
                    reason: { type: 'string' },
                    notes: { type: 'string' },
                    status: { type: 'string', enum: ['pending', 'confirmed', 'cancelled'] },
                },
            },
            Audit: {
                type: 'object',
                properties: {
                    id: { type: 'integer' },
                    userId: { type: 'integer' },
                    action: { type: 'string' },
                    targetTable: { type: 'string' },
                    targetId: { type: 'integer' },
                    timestamp: { type: 'string', format: 'date-time' },
                },
            },
        },
    },
    security: [{ bearerAuth: [] }],
    paths: {
        // =================== AUTH ===================
        '/auth/register': {
            post: {
                tags: ['Auth'],
                summary: 'Registrar nuevo usuario',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    name: { type: 'string' },
                                    email: { type: 'string' },
                                    password: { type: 'string' },
                                    role: { type: 'string', enum: ['admin', 'doctor', 'patient'] },
                                },
                                required: ['name', 'email', 'password', 'role'],
                            },
                        },
                    },
                },
                responses: {
                    201: { description: 'Usuario creado correctamente' },
                    400: { description: 'Error de validación' },
                },
            },
        },
        '/auth/login': {
            post: {
                tags: ['Auth'],
                summary: 'Iniciar sesión de usuario',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    email: { type: 'string' },
                                    password: { type: 'string' },
                                },
                                required: ['email', 'password'],
                            },
                        },
                    },
                },
                responses: {
                    200: { description: 'Inicio de sesión exitoso, devuelve token JWT' },
                    401: { description: 'Credenciales inválidas' },
                },
            },
        },

        // =================== USERS ===================
        // listado global administrado por admin (corrección solicitada)
        '/admin/users': {
            get: {
                tags: ['Users'],
                summary: 'Obtener todos los usuarios (solo admin)',
                security: [{ bearerAuth: [] }],
                responses: {
                    200: { description: 'Lista de usuarios' },
                    403: { description: 'Acceso denegado' },
                },
            },
        },

        '/users/{id}': {
            get: {
                tags: ['Users'],
                summary: 'Obtener usuario por ID',
                parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
                security: [{ bearerAuth: [] }],
                responses: {
                    200: { description: 'Usuario obtenido correctamente' },
                    404: { description: 'Usuario no encontrado' },
                },
            },
            put: {
                tags: ['Users'],
                summary: 'Actualizar usuario por ID (solo admin o usuario mismo)',
                parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
                security: [{ bearerAuth: [] }],
                requestBody: {
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    name: { type: 'string' },
                                    email: { type: 'string' },
                                    password: { type: 'string' },
                                    role: { type: 'string', enum: ['admin', 'doctor', 'patient'] },
                                },
                            },
                        },
                    },
                },
                responses: {
                    200: { description: 'Usuario actualizado correctamente' },
                    400: { description: 'Error de validación' },
                    403: { description: 'Acceso denegado' },
                },
            },
            delete: {
                tags: ['Users'],
                summary: 'Eliminar usuario por ID (solo admin)',
                parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
                security: [{ bearerAuth: [] }],
                responses: {
                    200: { description: 'Usuario eliminado correctamente' },
                    403: { description: 'Acceso denegado' },
                },
            },
        },

        // =================== TIMEBLOCKS ===================
        '/time-blocks': {
            get: {
                tags: ['TimeBlocks'],
                summary: 'Obtener todos los bloques de tiempo (admin y doctores)',
                security: [{ bearerAuth: [] }],
                responses: {
                    200: { description: 'Lista de bloques obtenida correctamente' },
                },
            },
        },
        '/time-blocks/{id}': {
            delete: {
                tags: ['TimeBlocks'],
                summary: 'Eliminar bloque de tiempo (admin o doctor propietario)',
                parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
                security: [{ bearerAuth: [] }],
                responses: {
                    200: { description: 'Bloque eliminado correctamente' },
                    403: { description: 'Acceso denegado' },
                },
            },
        },
        '/users/{doctorId}/time-blocks': {
            post: {
                tags: ['TimeBlocks (Doctor)'],
                summary: 'Crear bloque de tiempo (solo doctor)',
                parameters: [{ name: 'doctorId', in: 'path', required: true, schema: { type: 'integer' } }],
                security: [{ bearerAuth: [] }],
                requestBody: {
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/TimeBlock' },
                        },
                    },
                },
                responses: {
                    201: { description: 'Bloque creado correctamente' },
                    403: { description: 'Acceso denegado' },
                },
            },
        },

        // =================== RESERVATIONS ===================
        '/reservations': {
            get: {
                tags: ['Reservations'],
                summary: 'Obtener reservas (todas para admin, propias para doctor/paciente)',
                security: [{ bearerAuth: [] }],
                responses: {
                    200: { description: 'Lista de reservas obtenida correctamente' },
                    403: { description: 'Acceso denegado' },
                },
            },
            post: {
                tags: ['Reservations'],
                summary: 'Crear una reserva de cita médica',
                security: [{ bearerAuth: [] }],
                requestBody: {
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/Reservation' },
                        },
                    },
                },
                responses: {
                    201: { description: 'Reserva creada correctamente' },
                    400: { description: 'Error de validación' },
                    403: { description: 'Acceso denegado' },
                },
            },
        },
        '/reservations/{id}': {
            get: {
                tags: ['Reservations'],
                summary: 'Obtener reserva por ID',
                parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
                security: [{ bearerAuth: [] }],
                responses: {
                    200: { description: 'Reserva obtenida correctamente' },
                    404: { description: 'Reserva no encontrada' },
                },
            },
            put: {
                tags: ['Reservations'],
                summary: 'Actualizar reserva por ID (solo admin o paciente propietario)',
                parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
                security: [{ bearerAuth: [] }],
                requestBody: {
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/Reservation' },
                        },
                    },
                },
                responses: {
                    200: { description: 'Reserva actualizada correctamente' },
                    400: { description: 'Error de validación' },
                    403: { description: 'Acceso denegado' },
                },
            },
            delete: {
                tags: ['Reservations'],
                summary: 'Eliminar reserva (solo admin o paciente propietario)',
                parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
                security: [{ bearerAuth: [] }],
                responses: {
                    200: { description: 'Reserva eliminada correctamente' },
                    403: { description: 'Acceso denegado' },
                },
            },
        },

        // =================== AUDIT ===================
        '/audits': {
            get: {
                tags: ['Audits'],
                summary: 'Obtener todos los registros de auditoría (solo admin)',
                security: [{ bearerAuth: [] }],
                responses: {
                    200: { description: 'Lista de auditorías obtenida correctamente' },
                    403: { description: 'Acceso denegado' },
                },
            },
        },
        '/audits/{id}': {
            get: {
                tags: ['Audits'],
                summary: 'Obtener registro de auditoría por ID (solo admin)',
                parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
                security: [{ bearerAuth: [] }],
                responses: {
                    200: { description: 'Auditoría obtenida correctamente' },
                    404: { description: 'Registro no encontrado' },
                },
            },
        },
    },
};
