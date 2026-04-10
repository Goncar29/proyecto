const service = require('../services/reviewsService');

exports.create = async (req, res, next) => {
    try {
        const doctorId = parseInt(req.params.id, 10);
        if (!Number.isInteger(doctorId) || doctorId <= 0) {
            const e = new Error('Doctor not found');
            e.status = 404; e.code = 'NOT_FOUND';
            throw e;
        }
        const review = await service.createReview(doctorId, req.user, req.body);
        return res.status(201).json(review);
    } catch (err) {
        return next(err);
    }
};
