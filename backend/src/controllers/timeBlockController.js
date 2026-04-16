const prisma = require('../utils/prismaClient');

exports.getTimeBlocks = async (req, res, next) => {
    try {
        const doctorId = parseInt(req.query.doctorId, 10);
        const where = !isNaN(doctorId) ? { doctorId } : {};
        const blocks = await prisma.timeBlock.findMany({ where });
        res.status(200).json(blocks);
    } catch (error) {
        next(error);
    }
};

exports.getTimeBlockById = async (req, res, next) => {
    try {
        const id = parseInt(req.params.id, 10);
        const block = await prisma.timeBlock.findUnique({ where: { id } });
        if (!block) {
            return res.status(404).json({ error: 'TimeBlock not found' });
        }
        res.status(200).json(block);
    } catch (error) {
        next(error);
    }
};

exports.createTimeBlock = async (req, res, next) => {
    try {
        const { doctorId, startTime, endTime } = req.body;

        // Si es doctor, doctorId ya fue forzado en el router
        const start = new Date(startTime);
        const date = new Date(start);
        date.setUTCHours(0, 0, 0, 0);

        const block = await prisma.timeBlock.create({
            data: { doctorId, startTime: start, endTime: new Date(endTime), date },
        });

        res.status(201).json(block);
    } catch (error) {
        next(error);
    }
};

exports.updateTimeBlock = async (req, res, next) => {
    try {
        const id = parseInt(req.params.id, 10);
        const { startTime, endTime } = req.body;

        const block = await prisma.timeBlock.findUnique({ where: { id } });

        if (!block) {
            return res.status(404).json({ error: 'TimeBlock not found' });
        }

        // Validar que el doctor sea dueño del bloque
        if (req.user.role?.toLowerCase() === 'doctor' && block.doctorId !== req.user.id) {
            return res.status(403).json({ error: 'Acceso denegado' });
        }

        const updated = await prisma.timeBlock.update({
            where: { id },
            data: { startTime, endTime },
        });

        res.status(200).json(updated);
    } catch (error) {
        next(error);
    }
};

exports.deleteTimeBlock = async (req, res, next) => {
    try {
        const id = parseInt(req.params.id, 10);

        const block = await prisma.timeBlock.findUnique({ where: { id } });

        if (!block) {
            return res.status(404).json({ error: 'TimeBlock not found' });
        }

        // Validar que el doctor sea dueño
        if (req.user.role?.toLowerCase() === 'doctor' && block.doctorId !== req.user.id) {
            return res.status(403).json({ error: 'Acceso denegado' });
        }

        await prisma.timeBlock.delete({ where: { id } });
        res.status(204).send();
    } catch (error) {
        next(error);
    }
};
