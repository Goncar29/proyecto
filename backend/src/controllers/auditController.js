const { getAuditLogs } = require('../services/audit');

const getAuditLogsController = async (req, res, next) => {
    try {
        const logs = await getAuditLogs(req.query);
        res.json(logs);
    } catch (error) {
        return next(error);
    }
};

module.exports = { getAuditLogsController };