const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Bắt đầu xóa các bản ghi mock Ad Performance...');
  const adAnalyticDelete = await prisma.adAnalytics.deleteMany({});
  console.log(`Đã xóa ${adAnalyticDelete.count} bản ghi AdAnalytics.`);
  
  const analyticDelete = await prisma.analytics.deleteMany({
    where: { analyticsType: 'AD' }
  });
  console.log(`Đã xóa ${analyticDelete.count} bản ghi Analytics.`);

  const adAccountDelete = await prisma.adAccount.deleteMany({});
  console.log(`Đã xóa ${adAccountDelete.count} bản ghi AdAccount.`);

  console.log('Đã dọn dẹp sạch toàn bộ mock data của phần Ads!');
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
