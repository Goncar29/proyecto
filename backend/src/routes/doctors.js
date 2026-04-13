const { Router } = require('express');
const { authenticateToken, authorizeRole } = require('../middlewares/auth');
const auditMiddleware = require('../middlewares/auditMiddleware');
const validate = require('../middlewares/validate');
const reviewsController = require('../controllers/reviewsController');
const { createReviewSchema } = require('../schemas/reviewsSchema');

/**
 * Authenticated doctor-scoped endpoints. Mounted at /api/doctors.
 * Public read endpoints live under /api/public/doctors.
 */
const router = Router();

router.post(
    '/:id/reviews',
    authenticateToken,
    authorizeRole(['patient']),
    validate(createReviewSchema),
    auditMiddleware('Crear review'),
    reviewsController.create,
);

module.exports = router;
