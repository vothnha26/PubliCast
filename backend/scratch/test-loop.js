require('dotenv').config();
const postService = require('../src/services/workspace/post.service');
const autoListService = require('../src/services/workspace/auto-list.service');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("Starting test-loop script...");
  const brand = await prisma.brand.findFirst();
  const user = await prisma.user.findFirst();
  if (!brand || !user) {
    console.error("Brand or User not found");
    return;
  }

  // Create an active AutoList with Loop enabled
  const al = await prisma.autoList.create({
    data: {
      brandId: brand.id,
      name: "Loop Test Autolist " + Date.now(),
      targetPlatforms: "INSTAGRAM",
      scheduleType: "INTERVAL",
      intervalMinutes: 10,
      activeDays: "Mo,Tu,We,Th,Fr,Sa,Su",
      isActive: true,
      loopEnabled: true,
      sourceType: "MANUAL"
    }
  });

  console.log("Created Loop AutoList:", al.id);

  // Add 3 posts to this list
  const post1 = await prisma.post.create({
    data: {
      brandId: brand.id,
      createdByUserId: user.id,
      title: "Post 1",
      caption: "This is post 1",
      type: "VIDEO",
      status: "DRAFT",
      targetPlatforms: "INSTAGRAM",
      autoListId: al.id,
      createdAt: new Date(Date.now() - 5000)
    }
  });
  console.log("Created Post 1:", post1.id);

  const post2 = await prisma.post.create({
    data: {
      brandId: brand.id,
      createdByUserId: user.id,
      title: "Post 2",
      caption: "This is post 2",
      type: "VIDEO",
      status: "DRAFT",
      targetPlatforms: "INSTAGRAM",
      autoListId: al.id,
      createdAt: new Date(Date.now() - 3000)
    }
  });
  console.log("Created Post 2:", post2.id);

  const post3 = await prisma.post.create({
    data: {
      brandId: brand.id,
      createdByUserId: user.id,
      title: "Post 3",
      caption: "This is post 3",
      type: "VIDEO",
      status: "DRAFT",
      targetPlatforms: "INSTAGRAM",
      autoListId: al.id,
      createdAt: new Date(Date.now() - 1000)
    }
  });
  console.log("Created Post 3:", post3.id);

  // Recalculate schedules to set them to SCHEDULED
  console.log("Recalculating schedules...");
  await autoListService.recalculateQueueSchedules(al.id);

  // Check their status
  const postsBefore = await prisma.post.findMany({
    where: { autoListId: al.id },
    orderBy: { createdAt: 'asc' }
  });
  console.log("Posts before publish:", postsBefore.map(p => ({ id: p.id, title: p.title, status: p.status, scheduledAt: p.scheduledAt })));

  // Simulate publish of the first scheduled post
  console.log("\n--- SIMULATING PUBLISH FOR POST 1 ---");
  await postService.publishToPlatforms(post1.id);

  // Check posts state after publish
  console.log("\n--- POSTS STATE AFTER PUBLISH ---");
  const postsAfter = await prisma.post.findMany({
    where: {
      OR: [
        { autoListId: al.id },
        { title: "Post 1", autoListId: null }
      ]
    },
    orderBy: { createdAt: 'asc' }
  });
  postsAfter.forEach(p => {
    console.log(`ID: ${p.id} | title: ${p.title} | status: ${p.status} | autoListId: ${p.autoListId} | scheduledAt: ${p.scheduledAt ? p.scheduledAt.toISOString() : 'NULL'}`);
  });
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
