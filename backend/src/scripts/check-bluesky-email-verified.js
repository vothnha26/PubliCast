/**
 * Ad-hoc script: check whether a connected Bluesky account is email-verified,
 * by comparing what's cached in our DB against a live call to Bluesky's own
 * com.atproto.server.getSession endpoint.
 *
 * Usage: node src/scripts/check-bluesky-email-verified.js [brandId]
 * If brandId is omitted, checks the first Bluesky account found.
 */
const { PrismaClient } = require('@prisma/client');
const { decrypt } = require('../utils/encryption');
const { BskyAgent } = require('@atproto/api');

const prisma = new PrismaClient();

async function main() {
  const brandId = process.argv[2];

  const account = await prisma.socialAccount.findFirst({
    where: { platform: 'BLUESKY', ...(brandId ? { brandId } : {}) },
    include: { blueskyAccount: true }
  });

  if (!account) {
    console.log('No Bluesky account found' + (brandId ? ` for brand ${brandId}` : ''));
    return;
  }

  console.log(`Account: ${account.username} (${account.platformAccountId})`);
  console.log(`DB emailConfirmed: ${account.blueskyAccount?.emailConfirmed}`);

  const agent = new BskyAgent({ service: account.blueskyAccount?.pdsUrl || 'https://bsky.social' });
  await agent.resumeSession({
    accessJwt: decrypt(account.accessToken),
    refreshJwt: account.refreshToken ? decrypt(account.refreshToken) : undefined,
    did: account.platformAccountId,
    handle: account.username
  });

  const res = await agent.com.atproto.server.getSession();
  console.log(`Live Bluesky emailConfirmed: ${res.data.emailConfirmed}`);
  console.log(`Live Bluesky email: ${res.data.email}`);

  if (res.data.emailConfirmed && !account.blueskyAccount?.emailConfirmed) {
    console.log('\n⚠️  DB is stale — Bluesky says verified but DB still says not verified.');
    console.log('This should self-heal on the next publishPost() call, or run:');
    console.log(`  await socialAccountRepository.updateBlueskyMetrics('${account.id}', { emailConfirmed: true })`);
  }
}

main()
  .catch(err => {
    console.error('ERROR:', err.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
