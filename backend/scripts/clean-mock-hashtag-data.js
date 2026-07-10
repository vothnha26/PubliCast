const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Bắt đầu dọn dẹp dữ liệu phân tích giả lập cũ của Hashtag Tracker...');
  const result = await prisma.hashtagTracker.updateMany({
    data: {
      trendScoreJson: null,
      topPostsJson: null,
      lastFetchedAt: null
    }
  });
  console.log(`Đã dọn dẹp thành công! Đã reset ${result.count} hashtag trackers về trạng thái trống (sẵn sàng tải Real Data).`);
}

main()
  .catch(e => {
    console.error('Lỗi khi dọn dẹp dữ liệu:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
