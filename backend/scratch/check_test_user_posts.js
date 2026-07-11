const postService = require('../src/services/workspace/post.service');
const prisma = require('../src/config/prisma');

async function main() {
  const brand = await prisma.brand.findFirst({
    where: { name: 'Trong Phuc Brand' }
  });
  
  if (!brand) {
    console.error('Brand "Trong Phuc Tech" not found!');
    return;
  }
  
  console.log(`Checking posts for Brand: "${brand.name}" (ID: ${brand.id})`);
  
  // 1. Query all posts of this brand directly from Prisma
  const allPosts = await prisma.post.findMany({
    where: { brandId: brand.id }
  });
  console.log(`\nTotal posts in DB for this brand: ${allPosts.length}`);
  allPosts.forEach(p => {
    console.log(`- Title: "${p.title}", Status: ${p.status}, ScheduledAt: ${p.scheduledAt}, CreatedAt: ${p.createdAt}, targetPlatforms: "${p.targetPlatforms}", isLibrary: ${p.isLibrary}`);
  });

  // 2. Query posts via PostService.getPosts with Date Range
  const queryParams = {
    startDate: '2026-07-05',
    endDate: '2026-07-11',
    limit: 100
  };
  
  console.log(`\nQuerying posts via PostService.getPosts with range: ${queryParams.startDate} to ${queryParams.endDate}`);
  const result = await postService.getPosts(queryParams, brand.id);
  console.log(`Result posts count from service: ${result.data.length}`);
  result.data.forEach(p => {
    console.log(`- Service Title: "${p.title}", Status: ${p.status}, ScheduledAt: ${p.scheduledAt}, CreatedAt: ${p.createdAt}, platforms: ${JSON.stringify(p.platforms)}, isLibrary: ${p.isLibrary}`);
  });
}

main().catch(err => console.error(err)).finally(() => prisma.$disconnect());
