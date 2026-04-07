const { createTimeBlockService,
    listReservationsService,
    getUsersService,
    getUserIdService,
    updateUserService,
    deleteUserIdService,
    toggleUserStatusService
} = require('../services/adminService');

const createTimeBlock = async (req, res) => {
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
        res.status(error.status || 500).json({ error: error.message || 'Error creating time block' });
    }
};

const listReservations = async (req, res) => {
    try {
        const reservations = await listReservationsService();
        res.json(reservations);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching reservations' });
    }
};

const getUsers = async (req, res) => {
    try {
        const users = await getUsersService();
        res.json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Error fetching users' });
    }
};

const getUserId = async (req, res) => {
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
    try {
        const { name, email, password, role } = req.body;
        const data = {};
        if (name !== undefined) data.name = name;
        if (email !== undefined) data.email = email;
        if (password !== undefined) data.password = password;
        if (role !== undefined) data.role = role;
        const updated = await updateUserService(req.params.id, data);
        res.status(200).json(updated);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Error fetching users' });
    }
};

const deleteUserId = async (req, res) => {
    try {
        await deleteUserIdService(req.params.id);
        res.status(200).json({ message: 'User deleted successfully' })
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ error: 'Error deleting user' });
    }
};

const toggleUserStatus = async (req, res) => {
    const userId = parseInt(req.params.id, 10);
    const { isActive, isSuspended, suspensionReason } = req.body;

    try {
        // Llamamos al service
        const updatedUser = await toggleUserStatusService(
            userId,
            isActive,
            isSuspended,
            suspensionReason
        );

        res.json({
            message: 'User status updated successfully',
            user: updatedUser
        });
    } catch (error) {
        console.error('Error toggling user status:', error);
        res.status(500).json({ error: error.message || 'Error toggling user status' });
    }
};

module.exports = { createTimeBlock, listReservations, getUsers, getUserId, updateUserId, deleteUserId, toggleUserStatus };