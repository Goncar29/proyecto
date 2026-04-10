const express = require('express');
const cors = require('cors');
const routes = require('./routes');
const errorHandler = require('./middlewares/errorHandler');
const setupSwagger = require('./config/swagger');

const app = express();

// Security headers
app.use(require('helmet')());

// CORS — restrict in production, open in dev
const allowedOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',')
    : ['http://localhost:5173', 'http://localhost:3006'];
app.use(cors({ origin: allowedOrigins, credentials: true }));

// Body parser with size limit
app.use(express.json({ limit: '16kb' }));

// Logger
app.use(require('./middlewares/logger'));

// Health check (before auth, no /api prefix)
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Swagger UI
setupSwagger(app);

// Rutas principales
app.use('/api', routes);

// Manejo de errores
app.use(errorHandler);

module.exports = app;
