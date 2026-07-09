const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const lists = await prisma.autoList.findMany({
    include: {
      posts: {
        orderBy: { createdAt: 'asc' }
      }
    }
  });

  console.log("=== AUTOLISTS ===");
  lists.forEach(l => {
    console.log(`ID: ${l.id} | Name: ${l.name} | LoopEnabled: ${l.loopEnabled} | IsActive: ${l.isActive} | total: ${l.totalPostsCount} | published: ${l.publishedPostsCount}`);
    console.log("  Posts:");
    l.posts.forEach(p => {
      console.log(`    - ID: ${p.id} | Title: ${p.title} | Status: ${p.status} | CreatedAt: ${p.createdAt.toISOString()} | ScheduledAt: ${p.scheduledAt ? p.scheduledAt.toISOString() : 'NULL'} | platformPostId: ${p.platformPostId} | isDeleted: ${p.isDeleted}`);
    });
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
