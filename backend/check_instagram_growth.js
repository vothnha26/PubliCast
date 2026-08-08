// Check the NEWER analytics entry (2026-07-09 to 2026-08-08) which had reach: 344
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const analytics = await prisma.analytics.findFirst({
    where: { 
      id: '80f4aa8f-e0ae-421a-8486-b3c19cce4cd7',
    },
    include: { socialAnalytics: true },
  });

  if (!analytics?.socialAnalytics?.audienceDemographicsJson) {
    console.log('No analytics data found');
    return;
  }

  const raw = JSON.parse(analytics.socialAnalytics.audienceDemographicsJson);
  
  console.log('\n=== Summary ===');
  console.log(JSON.stringify(raw.summary, null, 2));

  console.log('\n=== Growth (all rows) ===');
  (raw.growth || []).forEach(g => console.log(JSON.stringify(g)));
  
  console.log(`\n=== Total growth rows: ${(raw.growth || []).length} ===`);
  
  // Show rows that have non-zero data
  const nonZeroGrowth = (raw.growth || []).filter(g => 
    g.views > 0 || g.followers > 0 || g.totalContent > 0 || g.reactions > 0 || g.comments > 0
  );
  console.log(`\n=== Non-zero growth rows: ${nonZeroGrowth.length} ===`);
  nonZeroGrowth.forEach(g => console.log(JSON.stringify(g)));
  
  console.log('\n=== InstagramChannelSnapshot ===');
  const snapshots = await prisma.instagramChannelSnapshot.findMany({
    where: { socialAccountId: '05668603-eac9-4b2c-93cc-322b43a4fe2c' },
    orderBy: { fetchedAt: 'desc' },
    take: 10,
  });
  snapshots.forEach(s => console.log(JSON.stringify({
    date: s.date, followersCount: s.followersCount, mediaCount: s.mediaCount,
    reachCount: s.reachCount, columns: s.columns
  })));
  if (snapshots.length === 0) console.log('  (none)');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
