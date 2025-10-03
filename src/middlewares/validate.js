const Joi = require('joi');

/**
 * Middleware genérico para validar datos con Joi
 * @param {Joi.Schema} schema - Esquema de validación Joi
 * @param {Object} options - Opciones extra (body/params/query, context dinámico)
 */
const validate = (schema, options = {}) => {
    return (req, res, next) => {
        try {
            // Selección de datos según origen
            const data = options.source
                ? req[options.source]
                : req.body; // default = body

            // Construcción de contexto dinámico
            const context = {};
            if (options.context) {
                for (const [key, value] of Object.entries(options.context)) {
                    context[key] = typeof value === 'function' ? value(req) : value;
                }
            }

            // Validación con Joi
            const { error, value } = schema.validate(data, {
                abortEarly: false,
                allowUnknown: false,
                context,
            });

            if (error) {
                return res.status(400).json({
                    message: 'Error de validación',
                    details: error.details.map((d) => d.message),
                });
            }

            // Si validó, sobreescribimos los datos validados
            if (options.source) {
                req[options.source] = value;
            } else {
                req.body = value;
            }

            next();
        } catch (err) {
            next(err);
        }
    };
};

module.exports = validate;