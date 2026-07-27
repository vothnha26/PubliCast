const { PrismaClient } = require('@prisma/client');

/**
 * Prisma Client singleton.
 * - In development: logs queries, errors, and warnings.
 * - In production: logs only errors to reduce noise.
 */
const prisma = new PrismaClient({
  log: ['error', 'warn']
});

module.exports = prisma;

