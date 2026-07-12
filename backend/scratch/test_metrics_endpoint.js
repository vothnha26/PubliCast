const prisma = require('../src/config/prisma');
const socialService = require('../src/services/social/social.service');

async function main() {
  const brandId = 'c6d29669-94ae-4a5b-b7d3-6aea6bc82225';
  const startDate = '2026-03-31';
  const endDate = '2026-07-02';
  try {
    console.log('Calling getAggregatedMetrics directly...');
    const data = await socialService.getAggregatedMetrics(brandId, startDate, endDate, false);
    
    // Write full result to a file so we can view it
    const fs = require('fs');
    fs.writeFileSync('C:\\Users\\ACER\\.gemini\\antigravity\\brain\\99020f6b-61d0-470e-b651-405f859ebdd8\\scratch\\output.txt', JSON.stringify(data, null, 2));
    console.log('Result written to output.txt');
    console.log('Keys in data:', Object.keys(data));
    if (data.facebookPage) {
      console.log('Facebook dailyData length:', data.facebookPage.dailyData?.length);
      if (data.facebookPage.dailyData && data.facebookPage.dailyData.length > 0) {
        console.log('First Facebook dailyData point:', data.facebookPage.dailyData[0]);
      }
    }
    if (data.tikTokAccount) {
      console.log('TikTok dailyData length:', data.tikTokAccount.dailyData?.length);
    }
  } catch (e) {
    console.error('Failed to get aggregated metrics:', e);
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
