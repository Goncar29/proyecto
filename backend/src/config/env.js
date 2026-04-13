/**
 * Environment validation — fail fast on missing required vars.
 * Import this at the top of server.js BEFORE anything else.
 */
const path = require('path');
// Look for .env in backend/ first, then fall back to repo root
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });
require('dotenv').config();

const required = ['DATABASE_URL', 'JWT_SECRET'];

const missing = required.filter((key) => !process.env[key]);

if (missing.length > 0) {
    console.error(`[env] Missing required environment variables: ${missing.join(', ')}`);
    process.exit(1);
}

module.exports = {
    PORT: Number(process.env.PORT) || 3006,
    NODE_ENV: process.env.NODE_ENV || 'development',
    JWT_SECRET: process.env.JWT_SECRET,
};
