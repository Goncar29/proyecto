module.exports = {
    openapi: '3.0.0',
    info: {
        title: 'API de Reservas Médicas',
        version: '1.0.0',
        description: 'API para gestión de citas médicas. Incluye autenticación JWT, control de roles (admin/doctor/patient), reservas y citas.',
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
                    role: { type: 'string', enum: ['PATIENT', 'DOCTOR', 'ADMIN'] },
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
                    date: { type: 'string', format: 'date-time' },
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
                    status: { type: 'string' },
                },
            },
            Appointment: {
                type: 'object',
                properties: {
                    id: { type: 'integer' },
                    doctorId: { type: 'integer' },
                    patientId: { type: 'integer' },
                    timeBlockId: { type: 'integer' },
                    date: { type: 'string', format: 'date-time' },
                    status: {
                        type: 'string',
                        enum: ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED'],
                    },
                    reason: { type: 'string' },
                    notes: { type: 'string' },
                },
            },
            AuditLog: {
                type: 'object',
                properties: {
                    id: { type: 'integer' },
                    userId: { type: 'integer' },
                    action: { type: 'string' },
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
                description: 'El rol por defecto es PATIENT',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    name: { type: 'string', minLength: 2 },
                                    email: { type: 'string', format: 'email' },
                                    password: { type: 'string', minLength: 8 },
                                },
                                required: ['name', 'email', 'password'],
                            },
                        },
                    },
                },
                responses: {
                    201: { description: 'Usuario creado correctamente' },
                    400: { description: 'Error de validación' },
                    409: { description: 'Email ya registrado' },
                },
            },
        },
        '/auth/login': {
            post: {
                tags: ['Auth'],
                summary: 'Iniciar sesión',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    email: { type: 'string', format: 'email' },
                                    password: { type: 'string' },
                                },
                                required: ['email', 'password'],
                            },
                        },
                    },
                },
                responses: {
                    200: { description: 'Login exitoso, devuelve token JWT' },
                    401: { description: 'Credenciales inválidas' },
                },
            },
        },

        // =================== USERS ===================
        '/users/{id}': {
            put: {
                tags: ['Users'],
                summary: 'Actualizar usuario',
                parameters: [
                    { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
                ],
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
                    200: { description: 'Usuario actualizado' },
                    400: { description: 'Error de validación' },
                    403: { description: 'Acceso denegado' },
                },
            },
        },
        '/users/{id}/reservations': {
            post: {
                tags: ['Reservations'],
                summary: 'Crear reserva (crea cita automáticamente)',
                parameters: [
                    { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
                ],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    doctorId: { type: 'integer' },
                                    patientId: { type: 'integer' },
                                    timeBlockId: { type: 'integer' },
                                    reason: { type: 'string' },
                                    notes: { type: 'string' },
                                },
                                required: ['doctorId', 'patientId', 'timeBlockId'],
                            },
                        },
                    },
                },
                responses: {
                    201: { description: 'Reserva creada' },
                    400: { description: 'Error de validación o bloque no disponible' },
                },
            },
            get: {
                tags: ['Reservations'],
                summary: 'Ver reservas',
                parameters: [
                    { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
                ],
                responses: {
                    200: { description: 'Reservas obtenidas' },
                    403: { description: 'Acceso denegado' },
                },
            },
        },
        '/users/{id}/reservations/{reservationId}': {
            put: {
                tags: ['Reservations'],
                summary: 'Actualizar reserva',
                parameters: [
                    { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
                    { name: 'reservationId', in: 'path', required: true, schema: { type: 'integer' } },
                ],
                requestBody: {
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/Reservation' },
                        },
                    },
                },
                responses: {
                    200: { description: 'Reserva actualizada' },
                    400: { description: 'Error de validación' },
                },
            },
            delete: {
                tags: ['Reservations'],
                summary: 'Eliminar reserva (solo admin)',
                parameters: [
                    { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
                    { name: 'reservationId', in: 'path', required: true, schema: { type: 'integer' } },
                ],
                responses: {
                    204: { description: 'Reserva eliminada' },
                    403: { description: 'Acceso denegado' },
                },
            },
        },

        // =================== APPOINTMENTS ===================
        '/users/{id}/appointments': {
            get: {
                tags: ['Appointments'],
                summary: 'Ver citas del usuario autenticado',
                description: 'Patient ve sus citas, doctor ve citas con sus pacientes, admin ve todas',
                parameters: [
                    { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
                ],
                responses: {
                    200: { description: 'Citas obtenidas' },
                },
            },
        },
        '/appointments': {
            get: {
                tags: ['Appointments'],
                summary: 'Ver todas las citas (filtradas por rol)',
                responses: {
                    200: { description: 'Citas obtenidas' },
                },
            },
        },
        '/appointments/{id}': {
            put: {
                tags: ['Appointments'],
                summary: 'Confirmar/cancelar cita (doctor, admin)',
                parameters: [
                    { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
                ],
                requestBody: {
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    status: { type: 'string', enum: ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED'] },
                                    notes: { type: 'string' },
                                },
                            },
                        },
                    },
                },
                responses: {
                    200: { description: 'Cita actualizada' },
                    400: { description: 'Error de validación' },
                },
            },
            delete: {
                tags: ['Appointments'],
                summary: 'Eliminar cita (solo admin)',
                parameters: [
                    { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
                ],
                responses: {
                    204: { description: 'Cita eliminada' },
                    403: { description: 'Acceso denegado' },
                },
            },
        },

        // =================== TIME BLOCKS ===================
        '/time-blocks': {
            get: {
                tags: ['TimeBlocks'],
                summary: 'Listar time-blocks disponibles',
                description: 'Accesible por patient, doctor y admin',
                responses: {
                    200: { description: 'Lista de bloques' },
                },
            },
            post: {
                tags: ['TimeBlocks'],
                summary: 'Crear time-block (doctor, admin)',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    startTime: { type: 'string', format: 'date-time' },
                                    endTime: { type: 'string', format: 'date-time' },
                                },
                                required: ['startTime', 'endTime'],
                            },
                        },
                    },
                },
                responses: {
                    201: { description: 'Bloque creado' },
                    400: { description: 'Error de validación' },
                },
            },
        },
        '/time-blocks/{id}': {
            get: {
                tags: ['TimeBlocks'],
                summary: 'Ver detalle de time-block',
                parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
                responses: {
                    200: { description: 'Bloque obtenido' },
                    404: { description: 'No encontrado' },
                },
            },
            put: {
                tags: ['TimeBlocks'],
                summary: 'Actualizar time-block (doctor, admin)',
                parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
                requestBody: {
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/TimeBlock' },
                        },
                    },
                },
                responses: {
                    200: { description: 'Bloque actualizado' },
                },
            },
            delete: {
                tags: ['TimeBlocks'],
                summary: 'Eliminar time-block (doctor, admin)',
                parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
                responses: {
                    204: { description: 'Bloque eliminado' },
                },
            },
        },

        // =================== ADMIN ===================
        '/admin/time-blocks': {
            post: {
                tags: ['Admin'],
                summary: 'Crear time-block para doctor específico (solo admin)',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    doctorId: { type: 'integer' },
                                    startTime: { type: 'string', format: 'date-time' },
                                    endTime: { type: 'string', format: 'date-time' },
                                },
                                required: ['doctorId', 'startTime', 'endTime'],
                            },
                        },
                    },
                },
                responses: {
                    201: { description: 'Bloque creado' },
                    403: { description: 'Acceso denegado' },
                },
            },
        },
        '/admin/reservations': {
            get: {
                tags: ['Admin'],
                summary: 'Ver todas las reservas (solo admin)',
                responses: {
                    200: { description: 'Reservas obtenidas' },
                },
            },
        },
        '/admin/users': {
            get: {
                tags: ['Admin'],
                summary: 'Listar usuarios (solo admin)',
                responses: {
                    200: { description: 'Lista de usuarios' },
                    403: { description: 'Acceso denegado' },
                },
            },
        },
        '/admin/users/{id}': {
            get: {
                tags: ['Admin'],
                summary: 'Ver usuario por ID (solo admin)',
                parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
                responses: {
                    200: { description: 'Usuario obtenido' },
                    404: { description: 'No encontrado' },
                },
            },
            put: {
                tags: ['Admin'],
                summary: 'Actualizar usuario (solo admin)',
                parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
                requestBody: {
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/User' },
                        },
                    },
                },
                responses: {
                    200: { description: 'Usuario actualizado' },
                },
            },
        },
        '/admin/users/{id}/status': {
            patch: {
                tags: ['Admin'],
                summary: 'Activar/desactivar usuario (solo admin)',
                parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
                requestBody: {
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    isActive: { type: 'boolean' },
                                    isSuspended: { type: 'boolean' },
                                    suspensionReason: { type: 'string' },
                                },
                            },
                        },
                    },
                },
                responses: {
                    200: { description: 'Estado actualizado' },
                },
            },
        },
        '/admin/audit': {
            get: {
                tags: ['Admin'],
                summary: 'Ver logs de auditoría (solo admin)',
                responses: {
                    200: {
                        description: 'Logs obtenidos',
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
