const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const limit = await prisma.planLimit.findFirst();

  // Create STARTER if not exists
  const starter = await prisma.plan.findFirst({ where: { name: 'STARTER' }});
  if (!starter) {
    await prisma.plan.create({
      data: {
        name: 'STARTER',
        priceAmount: 19,
        currency: 'USD',
        billingCycle: 'MONTHLY',
        description: 'Starter Plan',
        planLimitId: limit.id,
        isActive: true
      }
    });
  }

  // Create AGENCY if not exists
  const agency = await prisma.plan.findFirst({ where: { name: 'AGENCY' }});
  if (!agency) {
    await prisma.plan.create({
      data: {
        name: 'AGENCY',
        priceAmount: 99,
        currency: 'USD',
        billingCycle: 'MONTHLY',
        description: 'Agency Plan',
        planLimitId: limit.id,
        isActive: true
      }
    });
  }

  console.log('Successfully seeded missing plans.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
