const prisma = require('../../config/prisma');

class NotificationRepository {
  /**
   * Find system notifications with filters
   */
  async findManyAndCount(where, options = {}, viewerUserId = null) {
    const { skip = 0, take = 50, orderBy = { createdAt: 'desc' } } = options;

    const [notifications, total] = await Promise.all([
      prisma.systemNotification.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          readReceipts: {
            where: {
              userId: viewerUserId || ''
            }
          }
        }
      }),
      prisma.systemNotification.count({ where })
    ]);

    return { notifications, total };
  }

  async create(data) {
    return prisma.systemNotification.create({ data });
  }

  async markAsRead(where, userId) {
    const notification = await prisma.systemNotification.findFirst({
      where,
      select: { id: true }
    });

    if (!notification) {
      return { count: 0 };
    }

    await prisma.notificationReadReceipt.upsert({
      where: {
        notificationId_userId: {
          notificationId: notification.id,
          userId
        }
      },
      update: { readAt: new Date() },
      create: {
        notificationId: notification.id,
        userId
      }
    });

    return { count: 1 };
  }

  async markAllAsRead(where, userId) {
    const notifications = await prisma.systemNotification.findMany({
      where,
      select: { id: true }
    });

    if (notifications.length === 0) {
      return { count: 0 };
    }

    await prisma.notificationReadReceipt.createMany({
      data: notifications.map((notification) => ({
        notificationId: notification.id,
        userId
      })),
      skipDuplicates: true
    });

    return { count: notifications.length };
  }

  async count(where) {
    return prisma.systemNotification.count({ where });
  }
}

module.exports = new NotificationRepository();
