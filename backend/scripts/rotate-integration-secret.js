#!/usr/bin/env node
/**
 * Rotates an IntegrationClient's client_secret without downtime — SPEC.md §8.
 * The current secret is demoted to clientSecretPrevEncrypted and stays valid
 * for a grace period (24h by default, 1h with --emergency) so the caller
 * (Convo) has time to update its own ENV before the old secret stops being
 * accepted. See src/middlewares/hmac-auth.middleware.js for the verification
 * side of this window.
 *
 * Prints the new client_secret ONCE, in plaintext, to the console — same
 * pattern as create-integration-client.js. Never stored in plaintext
 * anywhere (only encrypted at rest) and never logged or written to a file.
 *
 * Usage:
 *   node scripts/rotate-integration-secret.js --client-id=<clientId> [--emergency]
 */
require('dotenv').config();
const crypto = require('node:crypto');
const os = require('node:os');
const prisma = require('../src/config/prisma');
const { findActiveClientById, encryptSecret } = require('../src/services/integrations/integration-client.service');

const GRACE_PERIOD_MS = {
  standard: 24 * 60 * 60 * 1000,
  emergency: 60 * 60 * 1000
};

function parseArgs() {
  const args = { emergency: false };
  for (const arg of process.argv.slice(2)) {
    if (arg === '--emergency') {
      args.emergency = true;
      continue;
    }
    const match = arg.match(/^--([^=]+)=(.*)$/);
    if (match) args[match[1]] = match[2];
  }
  return args;
}

async function main() {
  const { 'client-id': clientId, emergency } = parseArgs();
  if (!clientId) {
    console.error('Usage: node scripts/rotate-integration-secret.js --client-id=<clientId> [--emergency]');
    process.exit(1);
  }

  const client = await findActiveClientById(clientId);
  if (!client) {
    console.error(`No active IntegrationClient found for client_id=${clientId}`);
    process.exit(1);
  }

  const graceMs = emergency ? GRACE_PERIOD_MS.emergency : GRACE_PERIOD_MS.standard;
  const secretNew = crypto.randomBytes(32).toString('hex');
  const rotatedBy = `${os.hostname()}:${process.env.USER || process.env.USERNAME || 'unknown'}`;

  await prisma.$transaction(async (tx) => {
    await tx.integrationClient.update({
      where: { id: client.id },
      data: {
        clientSecretPrevEncrypted: client.clientSecretEncrypted,
        clientSecretEncrypted: encryptSecret(secretNew),
        secretRotatedAt: new Date(),
        secretPrevExpiresAt: new Date(Date.now() + graceMs)
      }
    });

    await tx.integrationSecretRotationLog.create({
      data: {
        clientId: client.clientId,
        reason: emergency ? 'COMPROMISED' : 'SCHEDULED',
        gracePeriodMs: graceMs,
        rotatedBy
      }
    });
  });

  const graceLabel = emergency ? '1 giờ (emergency)' : '24 giờ';
  console.log('Secret rotation completed. Store this value now — it will not be shown again:\n');
  console.log(`  client_id:         ${client.clientId}`);
  console.log(`  client_secret_new: ${secretNew}\n`);
  console.log(
    `Cập nhật CONVO_CLIENT_SECRET_PREV = secret cũ, CONVO_CLIENT_SECRET = secret mới trong Convo backend .env ` +
      `trong vòng ${graceLabel}, sau đó secret cũ sẽ ngừng được chấp nhận.`
  );
}

main()
  .catch((error) => {
    console.error('Failed to rotate integration secret:', error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
