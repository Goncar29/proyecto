const service = require('../services/publicDoctorsService');

exports.list = async (req, res, next) => {
    try {
        const result = await service.listDoctors(req.query);
        res.status(200).json(result);
    } catch (err) {
        next(err);
    }
};

exports.getById = async (req, res, next) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (!Number.isInteger(id) || id <= 0) {
            const e = new Error('Doctor not found');
            e.status = 404;
            e.code = 'NOT_FOUND';
            throw e;
        }
        const result = await service.getDoctorById(id);
        res.status(200).json(result);
    } catch (err) {
        next(err);
    }
};

exports.getReviews = async (req, res, next) => {
    try {
        const id = parseInt(req.params.id, 10);
        const result = await service.getDoctorReviews(id, req.query);
        res.status(200).json(result);
    } catch (err) {
        next(err);
    }
};

exports.getAvailability = async (req, res, next) => {
    try {
        const id = parseInt(req.params.id, 10);
        const result = await service.getDoctorAvailability(id, req.query);
        res.status(200).json(result);
    } catch (err) {
        next(err);
    }
};
