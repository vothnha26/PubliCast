const postService = require('../src/services/workspace/post.service');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const brand = await prisma.brand.findFirst();
  const user = await prisma.user.findFirst();
  if (!brand || !user) {
    console.error("Brand or User not found in DB");
    return;
  }

  // Create an autolist
  const al = await prisma.autoList.create({
    data: {
      brandId: brand.id,
      name: "Test Autolist " + Date.now(),
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

  try {
    const post = await postService.createPost({
      brandId: brand.id,
      title: "Untitled Post",
      caption: "",
      type: "VIDEO",
      status: "DRAFT",
      targetPlatforms: ["INSTAGRAM"],
      mediaUrls: [],
      autoListId: al.id
    }, user.id, brand.id);
    console.log("Created Post successfully:", post.id);
  } catch (err) {
    console.error("Error creating post:", err);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
