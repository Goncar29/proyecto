const swaggerUi = require('swagger-ui-express');
const swaggerDocs = require('../docs/swaggerDocs');

const setupSwagger = (app) => {
    app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));
    require('../utils/logger').info('Swagger UI available at /api/docs');
};

module.exports = setupSwagger;