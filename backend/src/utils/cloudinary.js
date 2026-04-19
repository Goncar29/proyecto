/**
 * Cloudinary helper.
 *
 * Wraps the upload_stream API (which takes a callback + stream) into a Promise
 * so we can await it cleanly from async controllers.
 *
 * Env vars required:
 *   CLOUDINARY_CLOUD_NAME
 *   CLOUDINARY_API_KEY
 *   CLOUDINARY_API_SECRET
 */
const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');

// Fail-fast — crash at startup if credentials are missing, not on first upload
const required = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'];
for (const key of required) {
    if (!process.env[key]) {
        throw new Error(`Missing required environment variable: ${key}`);
    }
}

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure:     true,
});

/**
 * Upload a Buffer to Cloudinary.
 *
 * @param {Buffer} buffer          - File buffer from multer memoryStorage
 * @param {string} folder          - Cloudinary folder (e.g. 'doctor-photos')
 * @param {object} [extraOpts={}]  - Extra Cloudinary upload options (e.g. { public_id, overwrite })
 * @returns {Promise<{ secure_url: string, public_id: string }>}
 */
const uploadBuffer = (buffer, folder, extraOpts = {}) =>
    new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            { folder, resource_type: 'image', ...extraOpts },
            (error, result) => {
                if (error) return reject(error);
                resolve({ secure_url: result.secure_url, public_id: result.public_id });
            },
        );
        streamifier.createReadStream(buffer).pipe(uploadStream);
    });

module.exports = { uploadBuffer };
