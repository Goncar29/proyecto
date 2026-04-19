/**
 * Controller for POST /api/users/me/photo
 *
 * Expects:  multipart/form-data with field "file" (image/jpeg|png|webp, max 5 MB)
 * Returns:  { photoUrl: string }
 *
 * Uses a deterministic Cloudinary public_id (user-avatars/user-{id}) so each
 * user always has at most one avatar stored — re-uploading overwrites the previous.
 */
const { uploadBuffer } = require('../utils/cloudinary');
const prisma = require('../utils/prismaClient');

const uploadUserPhoto = async (req, res, next) => {
    try {
        if (!req.file) {
            const err = new Error('No se adjuntó ningún archivo.');
            err.status = 400;
            return next(err);
        }

        // Deterministic public_id: one slot per user — overwrites on re-upload
        const { secure_url } = await uploadBuffer(
            req.file.buffer,
            'user-avatars',
            { public_id: `user-${req.user.id}`, overwrite: true },
        );

        const updated = await prisma.user.update({
            where: { id: Number(req.user.id) },
            data: { photoUrl: secure_url },
            select: { photoUrl: true },
        });

        res.json({ photoUrl: updated.photoUrl });
    } catch (err) {
        next(err);
    }
};

module.exports = { uploadUserPhoto };
