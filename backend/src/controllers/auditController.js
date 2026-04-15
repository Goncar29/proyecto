const { getAuditLogs } = require('../services/audit');

const getAuditLogsController = async (req, res, next) => {
    try {
        const result = await getAuditLogs(req.query);
        res.json(result);
    } catch (error) {
        return next(error);
    }
};

module.exports = { getAuditLogsController };