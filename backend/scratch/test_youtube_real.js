const prisma = require('../src/config/prisma');
const youtubeVideoService = require('../src/services/social/youtube/youtube-video.service');

async function main() {
  const brandId = 'c6d29669-94ae-4a5b-b7d3-6aea6bc82225';
  const realAccountId = '28468a70-3165-4848-80a2-2ef289fd9a45';

  try {
    console.log('Fetching videos for real YouTube account...');
    const result = await youtubeVideoService.getPublishedVideos(brandId, null, 20, realAccountId);
    console.log('Result:', JSON.stringify(result, null, 2));
  } catch (e) {
    console.error('Error fetching videos:', e);
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
