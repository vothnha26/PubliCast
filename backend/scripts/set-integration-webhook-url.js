#!/usr/bin/env node
/**
 * Sets or updates the webhookUrl for an existing IntegrationClient — SPEC.md §7.
 * Used to configure the real-time revocation webhook endpoint for Convo (or other
 * integration clients) in PubliCast.
 *
 * Usage:
 *   node scripts/set-integration-webhook-url.js --client-id=<clientId> --url=<webhookUrl>
 */
require('dotenv').config();
const prisma = require('../src/config/prisma');
const { findActiveClientById } = require('../src/services/integrations/integration-client.service');

function parseArgs() {
  const args = {};
  for (const arg of process.argv.slice(2)) {
    const match = arg.match(/^--([^=]+)=(.*)$/);
    if (match) args[match[1]] = match[2];
  }
  return args;
}

async function main() {
  const { 'client-id': clientId, url } = parseArgs();
  if (!clientId || !url) {
    console.error('Usage: node scripts/set-integration-webhook-url.js --client-id=<clientId> --url=<webhookUrl>');
    process.exit(1);
  }

  const client = await findActiveClientById(clientId);
  if (!client) {
    console.error(`No active IntegrationClient found for client_id=${clientId}`);
    process.exit(1);
  }

  try {
    new URL(url);
  } catch (e) {
    console.error(`Invalid URL provided: ${url}`);
    process.exit(1);
  }

  await prisma.integrationClient.update({
    where: { id: client.id },
    data: { webhookUrl: url }
  });

  console.log(`Successfully updated webhookUrl for client "${client.name}" (${client.clientId}):`);
  console.log(`  webhookUrl: ${url}\n`);
}

main()
  .catch((error) => {
    console.error('Failed to update integration client webhookUrl:', error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
