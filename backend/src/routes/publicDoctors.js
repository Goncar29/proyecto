const express = require('express');
const router = express.Router();
const controller = require('../controllers/publicDoctorsController');
const validate = require('../middlewares/validate');
const {
    listQuerySchema,
    reviewsQuerySchema,
    availabilityQuerySchema,
} = require('../schemas/publicDoctorsSchema');

/**
 * Public doctor discovery endpoints.
 * NO auth. NO audit. Exposed to anonymous traffic.
 *
 * Mounted at /api/public/doctors (see routes/index.js).
 */

router.get('/', validate(listQuerySchema, { source: 'query' }), controller.list);

router.get('/:id', controller.getById);

router.get(
    '/:id/reviews',
    validate(reviewsQuerySchema, { source: 'query' }),
    controller.getReviews,
);

router.get(
    '/:id/availability',
    validate(availabilityQuerySchema, { source: 'query' }),
    controller.getAvailability,
);

module.exports = router;
