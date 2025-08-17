const { createTimeBlockService, listReservationsService, getUsersService, getUserIdService } = require('../services/adminService');

const createTimeBlock = async (req, res) => {
    if (req.user.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Access denied' });
    }

    const { doctorId, startTime, endTime } = req.body;

    // Validaciones según el schema
    if (!doctorId || isNaN(doctorId)) {
        return res.status(400).json({ error: 'doctorId is required and must be a number' });
    }
    if (!startTime || !endTime) {
        return res.status(400).json({ error: 'startTime and endTime are required' });
    }
    const start = new Date(startTime);
    const end = new Date(endTime);
    if (isNaN(start) || isNaN(end)) {
        return res.status(400).json({ error: 'startTime and endTime must be valid dates' });
    }
    if (start >= end) {
        return res.status(400).json({ error: 'startTime must be before endTime' });
    }

    try {
        const newTimeBlock = await createTimeBlockService(doctorId, startTime, endTime);
        res.status(201).json(newTimeBlock);
    } catch (error) {
        res.status(500).json({ error: 'Error creating time block' });
    }
};

const listReservations = async (req, res) => {
    if (req.user.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Access denied' });
    }

    try {
        const reservations = await listReservationsService();
        res.json(reservations);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching reservations' });
    }
};

const getUsers = async (req, res) => {
    if (req.user.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Access denied' });
    }
    try {
        const users = await getUsersService();
        res.json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Error fetching users' });
    }
};

const getUserId = async (req, res) => {
    if (req.user.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Access denied' });
    }
    try {
        const { id } = req.params;
        if (!id || isNaN(id)) {
            return res.status(400).json({
                error: !id
                    ? 'User ID is required'
                    : 'User ID must be a number',
            });
        }

        const user = await getUserIdService(id);
        if (!user || user.deletedAt) {
            return res.status(404).json({ error: 'User not found' });
        }

        // No exponer password
        const { password, ...userSafe } = user;
        res.json(userSafe);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Error fetching users' });
    }
};

const updateUserId = async (req, res) => {
    if (req.user.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Access denied' });
    }
    try {
        const updated = await updateUserService(req.params.id, req.body);
        res.status(200).json(updated);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Error fetching users' });
    }
};

const deleteUserId = async (req, res) => {
    if (req.user.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Access denied' });
    }
    try {
        await deleteUserIdService(req.params.id);
        res.status(204).json({ message: 'User deleted successfully' })
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ error: 'Error deleting user' });
    }
};

module.exports = { createTimeBlock, listReservations, getUsers, getUserId, updateUserId, deleteUserId };