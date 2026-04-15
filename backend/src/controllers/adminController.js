const { createTimeBlockService,
    listReservationsService,
    getUsersService,
    getUserIdService,
    updateUserService,
    deleteUserIdService,
    toggleUserStatusService,
    promoteToDoctorService,
} = require('../services/adminService');

const createTimeBlock = async (req, res, next) => {
    try {
        const newTimeBlock = await createTimeBlockService(req.body.doctorId, req.body.startTime, req.body.endTime);
        res.status(201).json(newTimeBlock);
    } catch (error) {
        return next(error);
    }
};

const listReservations = async (req, res, next) => {
    try {
        const reservations = await listReservationsService();
        res.json(reservations);
    } catch (error) {
        return next(error);
    }
};

const getUsers = async (req, res, next) => {
    try {
        const users = await getUsersService();
        res.json(users);
    } catch (error) {
        return next(error);
    }
};

const getUserId = async (req, res, next) => {
    try {
        const { id } = req.params;
        const user = await getUserIdService(id);
        if (!user) {
            return res.status(404).json({ error: 'El usuario no existe.' });
        }
        const { password, ...userSafe } = user;
        res.json(userSafe);
    } catch (error) {
        return next(error);
    }
};

const updateUserId = async (req, res, next) => {
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
        return next(error);
    }
};

const deleteUserId = async (req, res, next) => {
    try {
        await deleteUserIdService(req.params.id);
        res.status(200).json({ message: 'Usuario eliminado correctamente.' });
    } catch (error) {
        return next(error);
    }
};

const toggleUserStatus = async (req, res, next) => {
    const userId = parseInt(req.params.id, 10);
    const { isActive, isSuspended, suspensionReason } = req.body;
    try {
        const updatedUser = await toggleUserStatusService(userId, isActive, isSuspended, suspensionReason);
        res.json({ message: 'Estado del usuario actualizado.', user: updatedUser });
    } catch (error) {
        return next(error);
    }
};

const promoteToDoctor = async (req, res, next) => {
    try {
        const result = await promoteToDoctorService(req.params.id, req.body);
        res.status(200).json(result);
    } catch (error) {
        return next(error);
    }
};

module.exports = { createTimeBlock, listReservations, getUsers, getUserId, updateUserId, deleteUserId, toggleUserStatus, promoteToDoctor };
