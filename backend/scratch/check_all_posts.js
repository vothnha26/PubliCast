const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const posts = await prisma.post.findMany({
    include: {
      brand: true
    }
  });
  console.log('Total posts in database:', posts.length);
  posts.forEach(p => {
    console.log({
      id: p.id,
      title: p.title,
      status: p.status,
      scheduledAt: p.scheduledAt,
      createdAt: p.createdAt,
      targetPlatforms: p.targetPlatforms,
      autoListId: p.autoListId,
      brandName: p.brand?.name
    });
  });
}

main().catch(err => console.error(err)).finally(() => prisma.$disconnect());
