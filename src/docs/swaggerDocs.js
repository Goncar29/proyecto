module.exports = {
    openapi: '3.0.0',
    info: {
        title: 'API de Reservas Médicas',
        version: '1.0.0',
        description:
            'Documentación de la API del sistema de gestión de citas médicas.\nIncluye endpoints de autenticación, usuarios, bloques de tiempo, reservas, citas y auditoría.',
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
                    isActive: { type: 'boolean' },
                },
            },
            TimeBlock: {
                type: 'object',
                properties: {
                    id: { type: 'integer' },
                    doctorId: { type: 'integer' },
                    startTime: { type: 'string', format: 'date-time' },
                    endTime: { type: 'string', format: 'date-time' },
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
                },
            },
            Appointment: {
                type: 'object',
                properties: {
                    id: { type: 'integer' },
                    doctorId: { type: 'integer' },
                    patientId: { type: 'integer' },
                    timeBlockId: { type: 'integer' },
                    status: {
                        type: 'string',
                        enum: ['pending', 'confirmed', 'cancelled'],
                    },
                },
            },
            AuditLog: {
                type: 'object',
                properties: {
                    id: { type: 'integer' },
                    userId: { type: 'integer' },
                    action: { type: 'string' },
                    entity: { type: 'string' },
                    entityId: { type: 'integer' },
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
        '/users/{id}': {
            put: {
                tags: ['Users'],
                summary: 'Actualizar usuario (solo autenticado)',
                parameters: [
                    { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
                ],
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
                                },
                            },
                        },
                    },
                },
                responses: {
                    200: { description: 'Usuario actualizado correctamente' },
                    400: { description: 'Error de validación' },
                },
            },
        },

        // =================== RESERVATIONS ===================
        '/users/{userId}/reservations': {
            post: {
                tags: ['Reservations'],
                summary: 'Crear reserva para un usuario autenticado',
                parameters: [
                    { name: 'userId', in: 'path', required: true, schema: { type: 'integer' } },
                ],
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
                },
            },
            get: {
                tags: ['Reservations'],
                summary: 'Obtener reservas de un usuario (doctor/paciente)',
                parameters: [
                    { name: 'userId', in: 'path', required: true, schema: { type: 'integer' } },
                ],
                security: [{ bearerAuth: [] }],
                responses: {
                    200: { description: 'Reservas obtenidas correctamente' },
                },
            },
        },
        '/users/{userId}/reservations/{reservationId}': {
            put: {
                tags: ['Reservations'],
                summary: 'Actualizar una reserva existente',
                parameters: [
                    { name: 'userId', in: 'path', required: true, schema: { type: 'integer' } },
                    { name: 'reservationId', in: 'path', required: true, schema: { type: 'integer' } },
                ],
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
                },
            },
            delete: {
                tags: ['Reservations'],
                summary: 'Eliminar una reserva',
                parameters: [
                    { name: 'userId', in: 'path', required: true, schema: { type: 'integer' } },
                    { name: 'reservationId', in: 'path', required: true, schema: { type: 'integer' } },
                ],
                security: [{ bearerAuth: [] }],
                responses: {
                    200: { description: 'Reserva eliminada correctamente' },
                },
            },
        },

        // =================== APPOINTMENTS ===================
        '/users/{userId}/appointments': {
            get: {
                tags: ['Appointments'],
                summary: 'Obtener todas las citas del usuario autenticado',
                description: `
Devuelve todas las citas relacionadas con el usuario autenticado.
- Si el usuario es **paciente**, obtiene solo sus propias citas.
- Si es **doctor**, obtiene las citas con sus pacientes.
- Si es **admin**, puede acceder a todas las citas.`,
                parameters: [
                    {
                        name: 'userId',
                        in: 'path',
                        required: true,
                        schema: { type: 'integer' },
                        description: 'ID del usuario cuyas citas se desean consultar',
                    },
                ],
                security: [{ bearerAuth: [] }],
                responses: {
                    200: { description: 'Citas obtenidas correctamente' },
                    403: { description: 'Acceso denegado' },
                    404: { description: 'No se encontraron citas para el usuario especificado' },
                },
            },
        },

        // =================== TIME BLOCKS ===================
        '/time-blocks': {
            post: {
                tags: ['TimeBlocks'],
                summary: 'Crear bloque de tiempo (doctor o admin)',
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
                },
            },
            get: {
                tags: ['TimeBlocks'],
                summary: 'Listar todos los bloques de tiempo (doctor/admin)',
                security: [{ bearerAuth: [] }],
                responses: {
                    200: { description: 'Lista de bloques obtenida' },
                },
            },
        },
        '/time-blocks/{id}': {
            get: {
                tags: ['TimeBlocks'],
                summary: 'Obtener bloque de tiempo por ID',
                parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
                security: [{ bearerAuth: [] }],
                responses: {
                    200: { description: 'Bloque obtenido correctamente' },
                    404: { description: 'Bloque no encontrado' },
                },
            },
            put: {
                tags: ['TimeBlocks'],
                summary: 'Actualizar bloque de tiempo por ID',
                parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
                security: [{ bearerAuth: [] }],
                requestBody: {
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/TimeBlock' },
                        },
                    },
                },
                responses: {
                    200: { description: 'Bloque actualizado correctamente' },
                },
            },
            delete: {
                tags: ['TimeBlocks'],
                summary: 'Eliminar bloque de tiempo por ID',
                parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
                security: [{ bearerAuth: [] }],
                responses: {
                    200: { description: 'Bloque eliminado correctamente' },
                },
            },
        },

        // =================== ADMIN ===================
        '/admin/users': {
            get: {
                tags: ['Admin'],
                summary: 'Obtener todos los usuarios (solo admin)',
                security: [{ bearerAuth: [] }],
                responses: {
                    200: { description: 'Lista de usuarios obtenida' },
                },
            },
        },
        '/admin/users/{id}': {
            get: {
                tags: ['Admin'],
                summary: 'Obtener usuario por ID',
                parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
                security: [{ bearerAuth: [] }],
                responses: {
                    200: { description: 'Usuario obtenido correctamente' },
                },
            },
            put: {
                tags: ['Admin'],
                summary: 'Actualizar usuario por ID',
                parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
                security: [{ bearerAuth: [] }],
                requestBody: {
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/User' },
                        },
                    },
                },
                responses: {
                    200: { description: 'Usuario actualizado correctamente' },
                },
            },
            delete: {
                tags: ['Admin'],
                summary: 'Eliminar usuario por ID',
                parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
                security: [{ bearerAuth: [] }],
                responses: {
                    200: { description: 'Usuario eliminado correctamente' },
                },
            },
        },
        '/admin/users/{id}/status': {
            patch: {
                tags: ['Admin'],
                summary: 'Cambiar estado de usuario (activar/desactivar)',
                parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
                security: [{ bearerAuth: [] }],
                responses: {
                    200: { description: 'Estado del usuario actualizado correctamente' },
                },
            },
        },
        '/admin/audit': {
            get: {
                tags: ['Audit'],
                summary: 'Obtener registros de auditoría (solo admin)',
                security: [{ bearerAuth: [] }],
                responses: {
                    200: {
                        description: 'Lista de auditorías obtenida correctamente',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'array',
                                    items: { $ref: '#/components/schemas/AuditLog' },
                                },
                            },
                        },
                    },
                },
            },
        },
    },
};
