const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const subscriptions = await prisma.subscription.findMany({
    include: {
      plan: true,
      brand: true
    }
  });
  console.log('Total subscriptions:', subscriptions.length);
  subscriptions.forEach(sub => {
    console.log({
      id: sub.id,
      brandName: sub.brand?.name,
      planName: sub.plan?.name,
      price: sub.plan?.priceAmount,
      billingCycle: sub.plan?.billingCycle,
      status: sub.status
    });
  });
}

main().catch(err => console.error(err)).finally(() => prisma.$disconnect());
