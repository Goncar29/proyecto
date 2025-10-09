const express = require('express');
const routes = require('./routes');
const errorHandler = require('./middlewares/errorHandler');
const setupSwagger = require('./config/swagger');

const app = express();

// Middleware global
app.use(express.json());

// Swagger UI
setupSwagger(app);

// Rutas principales
app.use('/api', routes);

// Manejo de errores
app.use(errorHandler);

// Ruta base
app.get('/', (req, res) => {
    res.send('Hola, mundo!');
});

module.exports = app;
