const prisma = require('../src/config/prisma');

async function test() {
  try {
    const posts = await prisma.post.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10
    });
    console.log('Recent posts:');
    posts.forEach(p => {
      console.log(`ID: ${p.id}, Title: ${p.title}, Status: ${p.status}, CreatedAt: ${p.createdAt}`);
      console.log(`  mediaUrls: ${p.mediaUrls}`);
      console.log(`  mediaThumbnailUrls: ${p.mediaThumbnailUrls}`);
      console.log(`  metadata: ${p.metadata}`);
      console.log('---');
    });
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

test();
