const prisma = require('../../config/prisma');

class AutoListRepository {
  async findManyByBrand(brandId) {
    return prisma.autoList.findMany({
      where: { brandId },
      include: {
        _count: {
          select: { posts: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async findById(id, client = prisma) {
    return client.autoList.findUnique({
      where: { id },
      include: {
        posts: {
          where: { isDeleted: false },
          orderBy: { createdAt: 'asc' }
        }
      }
    });
  }

  async create(data, client = prisma) {
    return client.autoList.create({
      data,
      include: { posts: true }
    });
  }

  async update(id, data, client = prisma) {
    return client.autoList.update({
      where: { id },
      data,
      include: { posts: true }
    });
  }

  async updateStats(id, stats, client = prisma) {
    return client.autoList.update({
      where: { id },
      data: stats
    });
  }

  async delete(id, client = prisma) {
    return client.autoList.delete({
      where: { id }
    });
  }

  /**
   * Locks the AutoList row (SELECT ... FOR UPDATE) inside an open transaction,
   * preventing concurrent recalculateQueueSchedules/deleteAutoList calls on the
   * same AutoList from racing (e.g. multiple posts in the same queue publishing
   * near-simultaneously under BullMQ's concurrency: 5).
   */
  async lockForUpdate(id, tx) {
    await tx.$queryRaw`SELECT id FROM auto_lists WHERE id = ${id} FOR UPDATE`;
  }
}

const autoListRepository = new AutoListRepository();
module.exports = autoListRepository;
