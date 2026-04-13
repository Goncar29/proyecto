// Jest global setup — loads environment variables before any test file is required.
// Runs once per worker BEFORE the test framework is installed, so Prisma client
// instantiation (triggered by module imports) sees DATABASE_URL.
require('dotenv').config();
