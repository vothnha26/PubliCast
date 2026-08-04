const { PrismaClient } = require('../../node_modules/.prisma/help-center-client');

/**
 * Prisma Client singleton for the Help Center PostgreSQL database.
 * Separate from config/prisma.js (main MySQL client) — Help Center content
 * and its pgvector embeddings live in an isolated database.
 */
const helpCenterPrisma = new PrismaClient({
  log: ['error', 'warn']
});

module.exports = helpCenterPrisma;
