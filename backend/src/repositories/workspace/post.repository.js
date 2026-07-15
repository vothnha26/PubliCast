require('../../utils/polyfill');
const prisma = require('../../config/prisma');

function normalizeWindowsPaths(val) {
  if (typeof val === 'string') {
    let clean = val.toWellFormed();
    if (clean.includes('\\') && (/[a-zA-Z]:\\/.test(clean) || /uploads|media|temp|publicast/i.test(clean))) {
      return clean.replace(/\\/g, '/');
    }
    return clean;
  }
  if (Array.isArray(val)) {
    return val.map(normalizeWindowsPaths);
  }
  if (val && typeof val === 'object' && !(val instanceof Date)) {
    const result = {};
    for (const key of Object.keys(val)) {
      result[key] = normalizeWindowsPaths(val[key]);
    }
    return result;
  }
  return val;
}

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
    const cleanData = normalizeWindowsPaths(data);
    try {
      return await prisma.post.create({
        data: cleanData,
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
    } catch (error) {
      console.error('[PostRepository.create] ERROR payload:', JSON.stringify(cleanData, null, 2));
      throw error;
    }
  }

  async update(id, data) {
    const cleanData = normalizeWindowsPaths(data);
    try {
      return await prisma.post.update({
        where: { id },
        data: cleanData,
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
    } catch (error) {
      console.error('[PostRepository.update] ERROR payload:', JSON.stringify(cleanData, null, 2));
      throw error;
    }
  }

  async findManyByIdsAndBrand(ids, brandId) {
    return prisma.post.findMany({
      where: {
        id: { in: ids },
        brandId
      }
    });
  }

  async updateStatus(id, status, client = prisma) {
    return client.post.update({
      where: { id },
      data: { status }
    });
  }

  async deleteMany(where) {
    return prisma.post.deleteMany({ where });
  }

  async updateMany(where, data) {
    const cleanData = normalizeWindowsPaths(data);
    return prisma.post.updateMany({
      where,
      data: cleanData
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
