const prisma = require('../../config/prisma');

class InboxRepository {
  /**
   * Find inbox items with filters and pagination
   * @param {Object} where - Prisma where conditions
   * @param {Object} options - { skip, take, orderBy }
   * @returns {Promise<Object>} { items, total }
   */
  async findManyAndCount(where, options = {}) {
    const { skip = 0, take = 20, orderBy = { platformCreatedAt: 'desc' } } = options;

    const [items, total] = await Promise.all([
      prisma.inboxItem.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          assignedUser: {
            select: { id: true, name: true, avatarUrl: true }
          },
          repliedBy: {
            select: { id: true, name: true, avatarUrl: true }
          },
          replies: {
             select: { authorId: true, authorName: true, authorAvatarUrl: true }
          }
        }
      }),
      prisma.inboxItem.count({ where })
    ]);

    return { items, total };
  }

  async findById(id) {
    if (!id) return null;
    return prisma.inboxItem.findFirst({
      where: {
        OR: [
          { id },
          { platformItemId: id },
          { relatedPostId: id }
        ]
      },
      include: {
        inbox: true,
        assignedUser: { select: { id: true, name: true, avatarUrl: true } },
        repliedBy: { select: { id: true, name: true, avatarUrl: true } },
        replies: {
          orderBy: { platformCreatedAt: 'asc' }
        }
      }
    });
  }

  async updateStatus(id, status) {
    const existingItems = await prisma.inboxItem.findMany({
      where: {
        OR: [
          { id },
          { platformItemId: id },
          { relatedPostId: id }
        ]
      },
      select: { id: true }
    });

    if (existingItems.length === 0) {
      return { count: 0 };
    }

    const itemIds = existingItems.map(item => item.id);

    return prisma.inboxItem.updateMany({
      where: { id: { in: itemIds } },
      data: { status }
    });
  }

  async updateInboxItem(id, data) {
    if (data.authorAvatarUrl && data.authorAvatarUrl.length > 190) {
      data.authorAvatarUrl = data.authorAvatarUrl.substring(0, 190);
    }
    const existing = await prisma.inboxItem.findFirst({
      where: {
        OR: [
          { id },
          { platformItemId: id },
          { relatedPostId: id }
        ]
      },
      select: { id: true }
    });

    if (!existing) {
      return null;
    }

    return prisma.inboxItem.update({
      where: { id: existing.id },
      data
    });
  }

  async findOrCreateInbox(brandId) {
    let inbox = await prisma.unifiedInbox.findUnique({ where: { brandId } });
    if (!inbox) {
      inbox = await prisma.unifiedInbox.create({ data: { brandId } });
    }
    return inbox;
  }

  async upsertInboxItem(where, update, create) {
    if (update.authorAvatarUrl && update.authorAvatarUrl.length > 190) {
      update.authorAvatarUrl = update.authorAvatarUrl.substring(0, 190);
    }
    if (create.authorAvatarUrl && create.authorAvatarUrl.length > 190) {
      create.authorAvatarUrl = create.authorAvatarUrl.substring(0, 190);
    }
    return prisma.inboxItem.upsert({
      where,
      update,
      create
    });
  }

  async findInboxItemByPlatformId(platformItemId) {
    return prisma.inboxItem.findUnique({
      where: { platformItemId }
    });
  }

  /**
   * Finds children whose parent comment hadn't arrived yet when they were
   * ingested (out-of-order webhook delivery), and links them to the
   * now-available parent (#100).
   */
  async reconcilePendingChildren(parentPlatformItemId, parentDbId) {
    return prisma.inboxItem.updateMany({
      where: { pendingParentPlatformId: parentPlatformItemId },
      data: { parentItemId: parentDbId, pendingParentPlatformId: null }
    });
  }

  async createInboxItem(data) {
    if (data.authorAvatarUrl && data.authorAvatarUrl.length > 190) {
      data.authorAvatarUrl = data.authorAvatarUrl.substring(0, 190);
    }
    return prisma.inboxItem.create({ data });
  }

  async updateInboxLastSync(inboxId) {
    return prisma.unifiedInbox.update({
      where: { id: inboxId },
      data: { lastSyncAt: new Date() }
    });
  }

  async deleteInboxItem(id) {
    return prisma.inboxItem.delete({
      where: { id }
    });
  }
}

module.exports = new InboxRepository();
