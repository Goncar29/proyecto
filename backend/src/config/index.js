module.exports = {
    SALT_ROUNDS: Number(process.env.SALT_ROUNDS) || 10,
    JWT_SECRET: process.env.JWT_SECRET,
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '15m',
    REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET,
    REFRESH_TOKEN_EXPIRES_IN: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d',
    // Cookie name used for refresh token
    REFRESH_COOKIE_NAME: 'refresh_token',
    // ms → used by cookie maxAge
    REFRESH_TOKEN_MAX_AGE_MS: 7 * 24 * 60 * 60 * 1000,
};
