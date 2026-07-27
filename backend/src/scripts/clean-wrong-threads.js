const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Đang dọn dẹp các tài khoản Threads bị lưu sai thành INSTAGRAM...');
  const res = await prisma.socialAccount.deleteMany({
    where: {
      platform: 'INSTAGRAM',
      displayName: 'Threads Business Test'
    }
  });
  console.log(`Đã dọn dẹp thành công ${res.count} tài khoản Threads cũ!`);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
