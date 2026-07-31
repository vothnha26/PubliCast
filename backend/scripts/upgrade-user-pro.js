const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const email = 'vothanhnha26@gmail.com';
  const user = await prisma.user.findUnique({
    where: { email },
    include: { brands: { include: { subscription: true } } }
  });

  if (!user) {
    console.log(`❌ User ${email} not found.`);
    return;
  }

  const proPlan = await prisma.plan.findFirst({
    where: { name: 'PRO' }
  });

  if (!proPlan) {
    console.log('❌ PRO plan not found in database.');
    return;
  }

  console.log(`👤 User: ${user.name} (${user.email})`);
  console.log(`📋 Brands found: ${user.brands.length}`);

  for (const brand of user.brands) {
    if (brand.subscription) {
      await prisma.subscription.update({
        where: { id: brand.subscription.id },
        data: {
          planId: proPlan.id,
          status: 'ACTIVE',
          currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
        }
      });
      console.log(`✅ Updated subscription for brand "${brand.name}" (${brand.id}) -> PRO Plan`);
    } else {
      await prisma.subscription.create({
        data: {
          brandId: brand.id,
          planId: proPlan.id,
          status: 'ACTIVE',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
        }
      });
      console.log(`✅ Created PRO subscription for brand "${brand.name}" (${brand.id})`);
    }
  }
}

main()
  .catch((err) => {
    console.error('Error upgrading plan:', err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
