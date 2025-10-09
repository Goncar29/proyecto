const swaggerUi = require('swagger-ui-express');
const swaggerDocs = require('../docs/swaggerDocs');

const setupSwagger = (app) => {
    app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));
    console.log('✅ Swagger UI disponible en: http://localhost:3005/api/docs');
};

module.exports = setupSwagger;