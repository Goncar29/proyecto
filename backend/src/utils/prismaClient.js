const { PrismaClient } = require('@prisma/client');

const globalForPrisma = globalThis;
let prisma;

if (!globalForPrisma.__prisma) {
    globalForPrisma.__prisma = new PrismaClient();
}
prisma = globalForPrisma.__prisma;

module.exports = prisma;