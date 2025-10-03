exports.createTimeBlock = async (req, res, next) => {
    try {
        const { doctorId, startTime, endTime } = req.body;

        // Si es doctor, doctorId ya fue forzado en el router
        const block = await prisma.timeBlock.create({
            data: { doctorId, startTime, endTime },
        });

        res.json(block);
    } catch (error) {
        next(error);
    }
};

exports.updateTimeBlock = async (req, res, next) => {
    try {
        const id = parseInt(req.params.id, 10);
        const { startTime, endTime, forceDoctorId } = req.body;

        const block = await prisma.timeBlock.findUnique({ where: { id } });

        if (!block) {
            return res.status(404).json({ error: 'TimeBlock not found' });
        }

        // Validar que el doctor sea dueño del bloque
        if (forceDoctorId && block.doctorId !== forceDoctorId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const updated = await prisma.timeBlock.update({
            where: { id },
            data: { startTime, endTime },
        });

        res.json(updated);
    } catch (error) {
        next(error);
    }
};

exports.deleteTimeBlock = async (req, res, next) => {
    try {
        const id = parseInt(req.params.id, 10);
        const { forceDoctorId } = req.body;

        const block = await prisma.timeBlock.findUnique({ where: { id } });

        if (!block) {
            return res.status(404).json({ error: 'TimeBlock not found' });
        }

        // Validar que el doctor sea dueño
        if (forceDoctorId && block.doctorId !== forceDoctorId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        await prisma.timeBlock.delete({ where: { id } });
        res.json({ message: 'TimeBlock deleted successfully' });
    } catch (error) {
        next(error);
    }
};
