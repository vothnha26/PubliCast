const prisma = require('../src/config/prisma');
const facebookAnalytics = require('../src/services/social/facebook/facebook-analytics.service');

async function main() {
  const socialAccountId = '55feb6fb-96e1-4974-8d78-e1fc568c4da4';
  try {
    console.log('Testing Facebook Analytics sync containing stories...');
    const result = await facebookAnalytics.syncChannelMetrics(
      socialAccountId,
      new Date('2026-03-31'),
      new Date('2026-07-02')
    );
    console.log('Sync finished successfully.');
    console.log('Stories count:', result.facebookPage?.stories?.length || 0);
  } catch (e) {
    console.error('Test failed with error:', e);
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
