// const errorHandle = (err, req, res, next) => {
//     const statusCode = err.statusCode || 500;
//     const message = err.message || 'Internal Server Error';
//     console.error(`[Error] ${new Date().toISOString()} - ${statusCode} - ${message}`);

//     if (err.stack) {
//         console.error(err.stack);
//     }

//     res.status(statusCode).json({
//         status: 'error',
//         statusCode,
//         message,
//         ...err(process.env.NODE_ENV === 'development' && { stack: err.stack })
//     });
// }

module.exports = errorHandle;
const errorHandler = (err, req, res, next) => {
    if (err.isJoi) {
        return res.status(400).json({ error: err.details[0].message });
    }
    res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
};

module.exports = errorHandler;
