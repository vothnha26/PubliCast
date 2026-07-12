const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const al = await prisma.autoList.findUnique({
    where: { id: "c7015879-33ca-4591-b1e5-ba1a26951711" }
  });
  console.log("=== AUTOLIST DETAILS ===");
  console.log(JSON.stringify(al, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
