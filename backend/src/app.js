const express = require('express');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');
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

// Global rate limit — 100 requests per 15 min per IP
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later', code: 'RATE_LIMITED' },
});
app.use(globalLimiter);

// Body parser with size limit
app.use(express.json({ limit: '16kb' }));

// Request timeout (30s)
app.use(require('./middlewares/timeout')());

// Logger
app.use(require('./middlewares/logger'));

// Health check (before auth, no /api prefix)
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Swagger UI
setupSwagger(app);

// Rutas principales
app.use('/api', routes);

// Serve frontend static files in production
const frontendDist = path.join(__dirname, '../../frontend/dist');
app.use(express.static(frontendDist));
app.get('{*path}', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path === '/health') return next();
    res.sendFile(path.join(frontendDist, 'index.html'));
});

// Manejo de errores
app.use(errorHandler);

module.exports = app;
