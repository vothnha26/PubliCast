const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const al = await prisma.autoList.findUnique({
    where: { id: "c7015879-33ca-4591-b1e5-ba1a26951711" },
    include: {
      brand: {
        include: {
          owner: true
        }
      }
    }
  });
  console.log("=== AUTOLIST BRAND OWNER ===");
  console.log(`Brand: ${al.brand.name} (${al.brand.id})`);
  console.log(`Owner: ${al.brand.owner.email} (${al.brand.owner.name})`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
