require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

prisma.autoList.update({
  where: { id: '1df309e5-31c5-4373-97b4-e868a3f92e12' },
  data: { loopEnabled: false }
}).then(r => console.log('reset loopEnabled:', r.loopEnabled))
  .finally(() => prisma.$disconnect());
