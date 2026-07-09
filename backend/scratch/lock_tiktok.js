const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.platformLimit.updateMany({
    where: { platform: 'TIKTOK' },
    data: {
      isLocked: true,
      lockReason: 'TikTok API đang bảo trì đột xuất cho đến 20h tối nay.'
    }
  });
  console.log('Locked TikTok limits count:', result.count);
}

main().catch(console.error).finally(() => prisma.$disconnect());
