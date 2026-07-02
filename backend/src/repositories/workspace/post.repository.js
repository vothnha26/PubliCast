const prisma = require('../../config/prisma');

class PostRepository {
  /**
   * Find posts with filters and pagination
   * @param {Object} where - Prisma where conditions
   * @param {Object} options - { skip, take, orderBy }
   * @returns {Promise<Object>} { posts, total }
   */
  async findMany(where, options = {}) {
    const { skip, take, orderBy } = options;
    return prisma.post.findMany({
      where,
      skip,
      take,
      orderBy
    });
  }

  async findManyAndCount(where, options = {}) {
    const { skip = 0, take = 10, orderBy = { createdAt: 'desc' } } = options;

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
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
          },
          approvalWorkflows: {
            orderBy: { requestedAt: 'desc' },
            take: 1,
            include: {
              reviewers: {
                include: {
                  reviewer: {
                    select: { id: true, name: true, avatarUrl: true }
                  }
                }
              }
            }
          }
        }
      }),
      prisma.post.count({ where })
    ]);

    return { posts, total };
  }

  async findById(id) {
    return prisma.post.findUnique({
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

  async create(data) {
    return prisma.post.create({
      data,
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

  async update(id, data) {
    return prisma.post.update({
      where: { id },
      data,
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

  async findManyByIdsAndBrand(ids, brandId) {
    return prisma.post.findMany({
      where: {
        id: { in: ids },
        brandId
      }
    });
  }

  async updateStatus(id, status) {
    return prisma.post.update({
      where: { id },
      data: { status }
    });
  }

  async deleteMany(where) {
    return prisma.post.deleteMany({ where });
  }

  async updateMany(where, data) {
    return prisma.post.updateMany({
      where,
      data
    });
  }

  async updateManyByIds(ids, data) {
    return prisma.post.updateMany({
      where: { id: { in: ids } },
      data
    });
  }

  async countActivePostsThisMonth(brandId) {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    return prisma.post.count({
      where: {
        brandId,
        createdAt: { gte: startOfMonth },
        isDeleted: false
      }
    });
  }
}

module.exports = new PostRepository();
