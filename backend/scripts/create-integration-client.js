#!/usr/bin/env node
/**
 * Creates a new IntegrationClient (e.g. for Convo) and prints the
 * client_secret ONCE, in plaintext, to the console — the same pattern
 * GitHub/AWS use for API key issuance. The secret is never stored in
 * plaintext anywhere (only encrypted at rest via src/utils/encryption.js)
 * and is not logged or written to any file by this script.
 *
 * Usage:
 *   node scripts/create-integration-client.js --name=convo
 */
require('dotenv').config();
const crypto = require('node:crypto');
const prisma = require('../src/config/prisma');
const { encryptSecret } = require('../src/services/integrations/integration-client.service');

function parseArgs() {
  const args = {};
  for (const arg of process.argv.slice(2)) {
    const match = arg.match(/^--([^=]+)=(.*)$/);
    if (match) args[match[1]] = match[2];
  }
  return args;
}

async function main() {
  const { name } = parseArgs();
  if (!name) {
    console.error('Usage: node scripts/create-integration-client.js --name=<label>');
    process.exit(1);
  }

  const clientId = crypto.randomUUID();
  const clientSecret = crypto.randomBytes(32).toString('hex');
  const clientSecretEncrypted = encryptSecret(clientSecret);

  await prisma.integrationClient.create({
    data: { name, clientId, clientSecretEncrypted }
  });

  console.log('Integration client created. Store these values now — the secret will not be shown again:\n');
  console.log(`  client_id:     ${clientId}`);
  console.log(`  client_secret: ${clientSecret}\n`);
}

main()
  .catch((error) => {
    console.error('Failed to create integration client:', error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
