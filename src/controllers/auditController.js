const { getAuditLogs } = require('../services/audit');

const listAuditLogs = async (req, res) => {
    if (req.user.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Access denied' });
    }
    try {
        const logs = await getAuditLogs();
        res.json(logs);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching audit logs' });
    }
};

module.exports = { listAuditLogs };