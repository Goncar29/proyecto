const { Router } = require('express');
const { updateUser, changePassword } = require('../controllers/userController');
const { uploadUserPhoto } = require('../controllers/userPhotoController');
const reservationsRouter = require('./reservations');
const appointmentsRouter = require('./appointments');
const { authenticateToken } = require('../middlewares/auth');
const auditMiddleware = require('../middlewares/auditMiddleware');
const validate = require('../middlewares/validate');
const { updateUserSchema, changePasswordSchema } = require('../schemas/usersSchema');
const uploadImage = require('../middlewares/uploadImage');

const router = Router();

// Rutas /me/* deben ir ANTES de /:id para que Express no las capture como param
router.patch(
    '/me/password',
    authenticateToken,
    validate(changePasswordSchema),
    auditMiddleware('Cambiar contraseña'),
    changePassword
);

router.post(
    '/me/photo',
    authenticateToken,
    uploadImage.single('file'),
    auditMiddleware('Subir foto de perfil'),
    uploadUserPhoto
);

router.put(
    '/:id',
    authenticateToken,
    validate(updateUserSchema),
    auditMiddleware('Actualizar usuario'),
    updateUser
);

router.use('/:id/appointments', authenticateToken, appointmentsRouter);
router.use('/:id/reservations', authenticateToken, reservationsRouter);

module.exports = router;
