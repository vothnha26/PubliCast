const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const brandId = '21deeec1-51b3-4f7a-a3ed-c8714ed6d683';
  const posts = await prisma.post.findMany({
    where: { brandId }
  });
  console.log('Total posts:', posts.length);
  posts.forEach(p => {
    console.log({
      id: p.id,
      title: p.title,
      status: p.status,
      scheduledAt: p.scheduledAt,
      createdAt: p.createdAt,
      platforms: p.platforms,
      autoListId: p.autoListId
    });
  });
}

main().catch(err => console.error(err)).finally(() => prisma.$disconnect());
