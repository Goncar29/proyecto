const errorHandler = (err, req, res, next) => {
    if (err.isJoi) {
        return res.status(400).json({ error: err.details[0].message });
    }
    res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
};

module.exports = errorHandler;
