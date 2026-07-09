require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const id = "1df309e5-31c5-4373-97b4-e868a3f92e12";
  
  // Simulate what backend does when update payload with loopEnabled: true
  const payload = {
    name: "New autolist 1",
    targetPlatforms: "FACEBOOK",
    scheduleType: "INTERVAL",
    intervalMinutes: 1,
    activeDays: "Mo,Tu,We,Th,Fr,Sa,Su",
    loopEnabled: true,
    isActive: true
  };

  console.log("Before update:", (await prisma.autoList.findUnique({ where: { id } }))?.loopEnabled);
  
  await prisma.autoList.update({
    where: { id },
    data: payload
  });
  
  console.log("After update:", (await prisma.autoList.findUnique({ where: { id } }))?.loopEnabled);
}

main().catch(console.error).finally(() => prisma.$disconnect());
