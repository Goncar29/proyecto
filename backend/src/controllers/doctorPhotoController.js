/**
 * Controller for POST /api/doctors/me/photo
 *
 * Expects:  multipart/form-data with field "file" (image/jpeg|png|webp, max 5 MB)
 * Returns:  { photoUrl: string }
 *
 * Flow:
 *   1. multer (uploadImage middleware) parses the file → req.file.buffer
 *   2. Buffer streamed to Cloudinary → returns secure_url
 *   3. photoUrl persisted via updateDoctorProfile (reuses existing service)
 *   4. { photoUrl } returned to client
 */
const { uploadBuffer }       = require('../utils/cloudinary');
const { updateDoctorProfile } = require('../services/doctorProfileService');

const uploadPhoto = async (req, res, next) => {
    try {
        if (!req.file) {
            const err = new Error('No se adjuntó ningún archivo.');
            err.status = 400;
            return next(err);
        }

        const { secure_url } = await uploadBuffer(req.file.buffer, 'doctor-photos');

        const profile = await updateDoctorProfile(req.user.id, { photoUrl: secure_url });

        res.json({ photoUrl: profile.photoUrl });
    } catch (err) {
        next(err);
    }
};

module.exports = { uploadPhoto };
