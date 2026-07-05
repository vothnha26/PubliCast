require('dotenv').config();
const autoListService = require('../src/services/workspace/auto-list.service');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { publishQueue } = require('../src/queues/publish.queue');

async function main() {
  const listId = "1b46777e-5540-475a-b07b-b075abbd5868";
  console.log("Checking if AutoList and its posts exist...");
  const al = await prisma.autoList.findUnique({
    where: { id: listId },
    include: { posts: true }
  });

  if (!al) {
    console.error("AutoList not found");
    return;
  }

  console.log(`AutoList ${al.name} has ${al.posts.length} posts.`);
  const postIds = al.posts.map(p => p.id);
  console.log("Post IDs:", postIds);

  // Check BullMQ jobs for these post IDs
  for (const pid of postIds) {
    const job = await publishQueue.getJob(`publish-post-${pid}`);
    console.log(`BullMQ job publish-post-${pid}: ${job ? 'Exists (delay: ' + job.delay + 'ms)' : 'Does not exist'}`);
  }

  console.log("\nDeleting AutoList...");
  await autoListService.deleteAutoList(listId);
  console.log("Deleted successfully.");

  // Verify DB deletion (Cascade)
  const alCheck = await prisma.autoList.findUnique({ where: { id: listId } });
  console.log("AutoList in DB after deletion:", alCheck ? "Exists" : "Null (Correct)");

  for (const pid of postIds) {
    const postCheck = await prisma.post.findUnique({ where: { id: pid } });
    console.log(`Post ${pid} in DB after deletion:`, postCheck ? "Exists" : "Null (Correct)");
    
    // Verify BullMQ jobs are removed
    const job = await publishQueue.getJob(`publish-post-${pid}`);
    console.log(`BullMQ job publish-post-${pid} after deletion: ${job ? 'Exists' : 'Null (Correct)'}`);
  }
}

main()
  .then(() => {
    console.log("Finished successfully");
    process.exit(0);
  })
  .catch(err => {
    console.error("Error in main:", err);
    process.exit(1);
  });
