const errorHandler = (err, req, res, next) => {
    if (err.isJoi) {
        return res.status(400).json({ error: err.details[0].message });
    }
    const status = err.status || 500;
    if (status >= 500) {
        console.error('[ErrorHandler]', err);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
    res.status(status).json({ error: err.message });
};

module.exports = errorHandler;
