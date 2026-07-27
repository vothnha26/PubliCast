const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.plan.updateMany({
    where: {
      name: { in: ['STARTER', 'PRO', 'AGENCY'] }
    },
    data: {
      priceAmount: 2000
    }
  });
  console.log('Successfully updated prices to 2000.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
