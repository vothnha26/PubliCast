const prisma = require('../../config/prisma');

class LivestreamRepository {
  /**
   * Find livestreams with filters and pagination
   * @param {Object} where - Prisma where conditions
   * @param {Object} options - { skip, take, orderBy }
   * @returns {Promise<Object>} { streams, total }
   */
  async findManyAndCount(where, options = {}) {
    const { skip = 0, take = 10, orderBy = { scheduledAt: 'desc' } } = options;

    const [streams, total] = await Promise.all([
      prisma.livestream.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              avatarUrl: true
            }
          }
        }
      }),
      prisma.livestream.count({ where })
    ]);

    return { streams, total };
  }

  async findById(id) {
    return prisma.livestream.findUnique({
      where: { id },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            avatarUrl: true
          }
        }
      }
    });
  }
}

module.exports = new LivestreamRepository();
