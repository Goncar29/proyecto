/**
 * Multer middleware for image uploads.
 *
 * Strategy: memoryStorage — files live as req.file.buffer, nothing
 * touches disk. The buffer is forwarded directly to Cloudinary.
 *
 * Restrictions:
 *   - Allowed MIME types: image/jpeg, image/png, image/webp
 *   - Max file size: UPLOAD_MAX_BYTES env var (default 5 MB)
 *
 * Usage in routes:
 *   router.post('/me/photo', uploadImage.single('file'), controller.uploadPhoto);
 *
 * On type rejection multer calls next() with a MulterError('LIMIT_UNEXPECTED_FILE')
 * — we convert that to a clear 400 in errorHandler.js.
 */
const multer = require('multer');

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_BYTES    = parseInt(process.env.UPLOAD_MAX_BYTES, 10) || 5 * 1024 * 1024; // 5 MB

const uploadImage = multer({
    storage: multer.memoryStorage(),
    limits:  { fileSize: MAX_BYTES },
    fileFilter: (_req, file, cb) => {
        if (ALLOWED_MIME.has(file.mimetype)) {
            cb(null, true);
        } else {
            // Passing an Error (not a MulterError) lets us set a custom message
            cb(new Error('INVALID_FILE_TYPE'));
        }
    },
});

module.exports = uploadImage;
