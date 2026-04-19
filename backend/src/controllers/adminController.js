const { createTimeBlockService,
    bulkCreateTimeBlocks,
    listReservationsService,
    getUsersService,
    getUserIdService,
    updateUserService,
    deleteUserIdService,
    toggleUserStatusService,
    promoteToDoctorService,
} = require('../services/adminService');
const { logAudit } = require('../services/audit');

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
        const { page, pageSize, status, search } = req.query;
        const result = await listReservationsService({ page, pageSize, status, search });
        res.json(result);
    } catch (error) {
        return next(error);
    }
};

const getUsers = async (req, res, next) => {
    try {
        const { page = 1, pageSize = 50 } = req.query;
        const result = await getUsersService({ page, pageSize });
        res.json(result);
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
        if (role !== undefined) data.role = role;
        // updateUserService ya hashea la password internamente — NO pre-hashear acá
        if (password !== undefined) data.password = password;

        const updated = await updateUserService(req.params.id, data);

        // Audit explícito cuando el admin cambia la password de otro usuario
        if (password !== undefined) {
            await logAudit(req.user.id, `Admin cambió password del usuario ${req.params.id}`);
        }

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

const bulkCreateTimeBlocksHandler = async (req, res, next) => {
    try {
        const result = await bulkCreateTimeBlocks(req.body);
        res.status(201).json(result);
    } catch (error) {
        return next(error);
    }
};

module.exports = { createTimeBlock, bulkCreateTimeBlocksHandler, listReservations, getUsers, getUserId, updateUserId, deleteUserId, toggleUserStatus, promoteToDoctor };
