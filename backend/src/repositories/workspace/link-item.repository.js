const prisma = require('../../config/prisma');

class LinkItemRepository {
  async findById(id) {
    return await prisma.linkItem.findUnique({
      where: { id }
    });
  }

  async incrementClicks(id) {
    return await prisma.linkItem.update({
      where: { id },
      data: {
        clicks: { increment: 1 }
      }
    });
  }

  async upsertDailyClick(linkItemId, smartLinkId, date) {
    // Dùng raw SQL để đảm bảo atomic INSERT ... ON CONFLICT DO UPDATE,
    // tránh race condition "Unique constraint failed" khi nhiều request đồng thời.
    const dateStr = date instanceof Date
      ? date.toISOString().slice(0, 10)
      : String(date).slice(0, 10);

    return await prisma.$executeRaw`
      INSERT INTO link_item_daily_metrics ("id", "linkItemId", "smartLinkId", "date", "clicks", "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), ${linkItemId}, ${smartLinkId}, ${dateStr}::date, 1, now(), now())
      ON CONFLICT ("linkItemId", "date")
      DO UPDATE SET "clicks" = link_item_daily_metrics."clicks" + 1, "updatedAt" = now()
    `;
  }

  async findDailyMetricsBySmartLink(smartLinkId, startDate, endDate) {
    return await prisma.linkItemDailyMetric.findMany({
      where: {
        smartLinkId,
        date: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: { date: 'asc' }
    });
  }
}

module.exports = new LinkItemRepository();
