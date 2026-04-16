const { Router } = require('express');
const { authenticateToken, authorizeRole } = require('../middlewares/auth');
const auditMiddleware = require('../middlewares/auditMiddleware');
const validate = require('../middlewares/validate');
const reviewsController = require('../controllers/reviewsController');
const reviewVoteController = require('../controllers/reviewVoteController');
const { createReviewSchema } = require('../schemas/reviewsSchema');
const { voteSchema } = require('../schemas/reviewVoteSchema');
const { updateDoctorProfile } = require('../services/doctorProfileService');
const { updateDoctorProfileSchema } = require('../schemas/doctorProfileSchema');

/**
 * Authenticated doctor-scoped endpoints. Mounted at /api/doctors.
 * Public read endpoints live under /api/public/doctors.
 */
const router = Router();

// PATCH /api/doctors/me/profile — doctor updates their own profile
router.patch(
    '/me/profile',
    authenticateToken,
    authorizeRole(['doctor']),
    validate(updateDoctorProfileSchema),
    auditMiddleware('Actualizar perfil de doctor'),
    async (req, res, next) => {
        try {
            const profile = await updateDoctorProfile(req.user.id, req.body);
            res.json(profile);
        } catch (err) {
            next(err);
        }
    },
);

router.post(
    '/:id/reviews',
    authenticateToken,
    authorizeRole(['patient']),
    validate(createReviewSchema),
    auditMiddleware('Crear review'),
    reviewsController.create,
);

// POST /api/doctors/:id/reviews/:reviewId/vote — patient votes on a review (toggles on repeat)
router.post(
    '/:id/reviews/:reviewId/vote',
    authenticateToken,
    authorizeRole(['patient']),
    validate(voteSchema),
    auditMiddleware('Votar en review'),
    reviewVoteController.castVote,
);

// GET /api/doctors/:id/reviews/:reviewId/my-vote — get current patient's vote
router.get(
    '/:id/reviews/:reviewId/my-vote',
    authenticateToken,
    authorizeRole(['patient']),
    reviewVoteController.getMyVote,
);

module.exports = router;
