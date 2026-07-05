require('dotenv').config();
const autoListService = require('../src/services/workspace/auto-list.service');
const postService = require('../src/services/workspace/post.service');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { publishQueue } = require('../src/queues/publish.queue');

async function main() {
  const brand = await prisma.brand.findFirst();
  const user = await prisma.user.findFirst();
  if (!brand || !user) {
    console.error("Brand or User not found");
    return;
  }

  // Create an active AutoList
  const al = await prisma.autoList.create({
    data: {
      brandId: brand.id,
      name: "Delete Test Autolist " + Date.now(),
      targetPlatforms: "INSTAGRAM",
      scheduleType: "INTERVAL",
      intervalMinutes: 10,
      activeDays: "Mo,Tu,We,Th,Fr,Sa,Su",
      isActive: true,
      loopEnabled: true,
      sourceType: "MANUAL"
    }
  });

  console.log("Created AutoList:", al.id);

  // Add 2 posts
  const post1 = await prisma.post.create({
    data: {
      brandId: brand.id,
      createdByUserId: user.id,
      title: "P1",
      caption: "P1 caption",
      type: "VIDEO",
      status: "DRAFT",
      targetPlatforms: "INSTAGRAM",
      autoListId: al.id
    }
  });

  const post2 = await prisma.post.create({
    data: {
      brandId: brand.id,
      createdByUserId: user.id,
      title: "P2",
      caption: "P2 caption",
      type: "VIDEO",
      status: "DRAFT",
      targetPlatforms: "INSTAGRAM",
      autoListId: al.id
    }
  });

  console.log("Recalculating schedules...");
  await autoListService.recalculateQueueSchedules(al.id);

  // Verify BullMQ jobs exist
  const job1Before = await publishQueue.getJob(`publish-post-${post1.id}`);
  const job2Before = await publishQueue.getJob(`publish-post-${post2.id}`);
  console.log(`Job 1 exists before delete: ${!!job1Before}`);
  console.log(`Job 2 exists before delete: ${!!job2Before}`);

  // Now delete the autolist
  console.log("\n--- TRIGGERING DELETE ---");
  await autoListService.deleteAutoList(al.id);

  // Check if jobs are removed
  const job1After = await publishQueue.getJob(`publish-post-${post1.id}`);
  const job2After = await publishQueue.getJob(`publish-post-${post2.id}`);
  console.log(`Job 1 exists after delete: ${!!job1After}`);
  console.log(`Job 2 exists after delete: ${!!job2After}`);

  // Verify posts are Cascade deleted
  const post1Check = await prisma.post.findUnique({ where: { id: post1.id } });
  const post2Check = await prisma.post.findUnique({ where: { id: post2.id } });
  console.log(`Post 1 in DB: ${post1Check ? 'Exists' : 'Null (Correct)'}`);
  console.log(`Post 2 in DB: ${post2Check ? 'Exists' : 'Null (Correct)'}`);
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
