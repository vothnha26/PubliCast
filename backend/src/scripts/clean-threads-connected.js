const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Xóa sạch tài khoản Threads connected...');
  const res = await prisma.socialAccount.deleteMany({
    where: {
      platform: 'THREADS'
    }
  });
  console.log(`Đã xóa thành công ${res.count} tài khoản Threads!`);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
