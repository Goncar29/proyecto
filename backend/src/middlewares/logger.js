const log = require('../utils/logger');

const LoggerMiddleware = (req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        const data = {
            method: req.method,
            url: req.originalUrl,
            status: res.statusCode,
            duration,
            ip: req.ip,
        };
        if (res.statusCode >= 500) {
            log.error(data, 'request error');
        } else if (res.statusCode >= 400) {
            log.warn(data, 'request warning');
        } else {
            log.info(data, 'request');
        }
    });
    next();
};

module.exports = LoggerMiddleware;