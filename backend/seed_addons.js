const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("Seeding addons...");

  const addonsData = [
    {
      id: "ADDON_TEAM", // Try to use custom ID if it accepts it, but if it's uuid it might reject non-uuid strings. 
      // Wait, Prisma id is @default(uuid()), let's just let Prisma generate ID or we can force it.
      // Actually Prisma `String @id` can be anything if we provide it.
      name: "Thêm +1 Team Member",
      type: "TEAM_MEMBER",
      priceAmount: 5000,
      currency: "VND",
      value: 1,
      isActive: true
    },
    {
      id: "ADDON_BRAND",
      name: "Thêm +1 Brand",
      type: "BRAND",
      priceAmount: 10000,
      currency: "VND",
      value: 1,
      isActive: true
    },
    {
      id: "ADDON_POST",
      name: "Extra 100 Posts",
      type: "POST",
      priceAmount: 8000,
      currency: "VND",
      value: 100,
      isActive: true
    }
  ];

  for (const data of addonsData) {
    await prisma.addon.upsert({
      where: { id: data.id },
      update: {},
      create: data,
    });
  }

  console.log("Addons seeded successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
