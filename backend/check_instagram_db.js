// Quick DB check script for Instagram data
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // 1. SocialAccount + InstagramAccount
  console.log('\n=== 1. Instagram SocialAccounts ===');
  const accounts = await prisma.socialAccount.findMany({
    where: { platform: 'INSTAGRAM' },
    include: { instagramAccount: true },
    take: 5,
  });
  accounts.forEach(a => {
    console.log(`ID: ${a.id} | username: ${a.username} | profilePictureUrl: ${a.profilePictureUrl}`);
    if (a.instagramAccount) {
      console.log(`  -> followers: ${a.instagramAccount.followersCount} | following: ${a.instagramAccount.followingCount} | media: ${a.instagramAccount.mediaCount}`);
    } else {
      console.log('  -> NO instagramAccount row!');
    }
  });
  if (accounts.length === 0) console.log('  (none found)');

  // 2. InstagramChannelSnapshot - last 10 rows
  console.log('\n=== 2. InstagramChannelSnapshot (last 10) ===');
  const snapshots = await prisma.instagramChannelSnapshot.findMany({
    orderBy: { fetchedAt: 'desc' },
    take: 10,
  });
  snapshots.forEach(s => {
    console.log(`socialAccountId: ${s.socialAccountId} | date: ${s.date} | followers: ${s.followersCount} | media: ${s.mediaCount} | reach: ${s.reachCount} | fetchedAt: ${s.fetchedAt}`);
  });
  if (snapshots.length === 0) console.log('  (none found - NO SNAPSHOTS IN DB)');

  // 3. SocialAnalytics for Instagram accounts
  console.log('\n=== 3. Analytics for Instagram ===');
  if (accounts.length > 0) {
    const accId = accounts[0].id;
    const analytics = await prisma.analytics.findMany({
      where: { socialAccountId: accId },
      include: { socialAnalytics: true },
      orderBy: { fetchedAt: 'desc' },
      take: 3,
    });
    analytics.forEach(a => {
      const sa = a.socialAnalytics;
      if (sa) {
        const raw = sa.audienceDemographicsJson ? sa.audienceDemographicsJson.substring(0, 400) : '(null)';
        console.log(`Analytics ID: ${a.id} | type: ${a.analyticsType} | from: ${a.dateFrom?.toISOString().slice(0,10)} to: ${a.dateTo?.toISOString().slice(0,10)}`);
        console.log(`  followersTotal: ${sa.followersTotal} | impressions: ${sa.impressions} | reach: ${sa.reach}`);
        console.log(`  audienceDemographicsJson (first 400 chars): ${raw}`);
      } else {
        console.log(`Analytics ID: ${a.id} | NO socialAnalytics!`);
      }
    });
    if (analytics.length === 0) console.log('  (no analytics rows)');
  }
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
