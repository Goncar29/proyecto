const validate = (schema) => (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });
    next();
};

module.exports = validate;


module.exports = (schema) => {
    return (req, res, next) => {
        const options = { abortEarly: false, stripUnknown: true };
        const { error, value } = schema.validate(req.body, options);

        if (error) {
            return res.status(400).json({
                error: 'Validación fallida',
                details: error.details.map(d => d.message)
            });
        }
        req.body = value;
        next();
    };

};

// abortEarly: false, nos muestra todos los errores, no solo el primero.
// stripUnknown: true, elimina campos que no están en el schema (seguridad extra).
// req.body = value, te aseguras que lo que llega al servicio ya está limpio.