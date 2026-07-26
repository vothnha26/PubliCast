const prisma = require('../../config/prisma');

class SmartLinkRepository {
  async findByBrandId(brandId) {
    return await prisma.smartLink.findFirst({
      where: { brandId },
      include: {
        links: {
          orderBy: {
            position: 'asc'
          }
        }
      }
    });
  }

  async findBySlug(slug) {
    return await prisma.smartLink.findFirst({
      where: { slug },
      include: {
        links: {
          where: { isActive: true },
          orderBy: {
            position: 'asc'
          }
        }
      }
    });
  }

  async findById(id) {
    return await prisma.smartLink.findUnique({
      where: { id },
      include: {
        links: {
          orderBy: {
            position: 'asc'
          }
        }
      }
    });
  }

  async create(data) {
    const { links, ...smartLinkData } = data;
    return await prisma.smartLink.create({
      data: {
        ...smartLinkData,
        links: links && links.length > 0 ? {
          createMany: {
            data: links.map((l, index) => ({
              title: l.title,
              url: l.url,
              iconUrl: l.iconUrl || null,
              linkStyle: l.linkStyle || null,
              emoji: l.emoji || null,
              position: l.position !== undefined ? l.position : index,
              isActive: l.isActive !== undefined ? l.isActive : true,
              scheduleFrom: l.scheduleFrom ? new Date(l.scheduleFrom) : null,
              scheduleTo: l.scheduleTo ? new Date(l.scheduleTo) : null
            }))
          }
        } : undefined
      },
      include: {
        links: true
      }
    });
  }

  async update(id, data) {
    const { links, ...smartLinkData } = data;

    // Use a transaction to update smart link and sync links
    return await prisma.$transaction(async (tx) => {
      // 1. Update SmartLink fields
      const updatedSmartLink = await tx.smartLink.update({
        where: { id },
        data: {
          ...smartLinkData,
          updatedAt: new Date()
        }
      });

      // 2. If links are provided, synchronize them
      if (links) {
        // Get existing link IDs
        const existingLinks = await tx.linkItem.findMany({
          where: { smartLinkId: id },
          select: { id: true }
        });
        const existingIds = existingLinks.map(l => l.id);

        const incomingIds = links.filter(l => l.id && !l.id.startsWith('l-')).map(l => l.id);

        // Delete links not in incoming links
        const toDeleteIds = existingIds.filter(eid => !incomingIds.includes(eid));
        if (toDeleteIds.length > 0) {
          await tx.linkItem.deleteMany({
            where: {
              id: { in: toDeleteIds }
            }
          });
        }

        // Upsert incoming links
        for (let index = 0; index < links.length; index++) {
          const l = links[index];
          const position = l.position !== undefined ? l.position : index;
          
          const linkData = {
            title: l.title,
            url: l.url,
            iconUrl: l.iconUrl || null,
            linkStyle: l.linkStyle || null,
            emoji: l.emoji || null,
            position,
            isActive: l.isActive !== undefined ? l.isActive : true,
            scheduleFrom: l.scheduleFrom ? new Date(l.scheduleFrom) : null,
            scheduleTo: l.scheduleTo ? new Date(l.scheduleTo) : null
          };

          if (l.id && !l.id.startsWith('l-') && existingIds.includes(l.id)) {
            // Update
            await tx.linkItem.update({
              where: { id: l.id },
              data: linkData
            });
          } else {
            // Create
            await tx.linkItem.create({
              data: {
                ...linkData,
                smartLinkId: id
              }
            });
          }
        }
      }

      // Return fully updated smart link
      return await tx.smartLink.findUnique({
        where: { id },
        include: {
          links: {
            orderBy: {
              position: 'asc'
            }
          }
        }
      });
    });
  }

  async incrementPageView(id, isUnique) {
    return await prisma.smartLink.update({
      where: { id },
      data: {
        uniqueVisitors: isUnique ? { increment: 1 } : undefined
      }
    });
  }

  async incrementTotalClicks(id) {
    return await prisma.smartLink.update({
      where: { id },
      data: {
        totalClicks: { increment: 1 }
      }
    });
  }

  async upsertDailyPageView(id, date, isUnique) {
    // Dùng raw SQL để đảm bảo atomic INSERT ... ON CONFLICT DO UPDATE,
    // tránh race condition khi nhiều request đồng thời.
    const dateStr = date instanceof Date
      ? date.toISOString().slice(0, 10)
      : String(date).slice(0, 10);

    if (isUnique) {
      return await prisma.$executeRaw`
        INSERT INTO smart_link_daily_metrics ("id", "smartLinkId", "date", "pageViews", "uniqueVisitors", "createdAt", "updatedAt")
        VALUES (gen_random_uuid(), ${id}, ${dateStr}::date, 1, 1, now(), now())
        ON CONFLICT ("smartLinkId", "date")
        DO UPDATE SET
          "pageViews"      = smart_link_daily_metrics."pageViews" + 1,
          "uniqueVisitors" = smart_link_daily_metrics."uniqueVisitors" + 1,
          "updatedAt"      = now()
      `;
    } else {
      return await prisma.$executeRaw`
        INSERT INTO smart_link_daily_metrics ("id", "smartLinkId", "date", "pageViews", "uniqueVisitors", "createdAt", "updatedAt")
        VALUES (gen_random_uuid(), ${id}, ${dateStr}::date, 1, 0, now(), now())
        ON CONFLICT ("smartLinkId", "date")
        DO UPDATE SET
          "pageViews" = smart_link_daily_metrics."pageViews" + 1,
          "updatedAt" = now()
      `;
    }
  }

  async findDailyMetrics(id, startDate, endDate) {
    return await prisma.smartLinkDailyMetric.findMany({
      where: {
        smartLinkId: id,
        date: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: { date: 'asc' }
    });
  }
}

module.exports = new SmartLinkRepository();
