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

  async findById(id, client = prisma) {
    return client.post.findUnique({
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

  /** Khóa dòng post (SELECT ... FOR UPDATE) trong 1 transaction đang mở, ngăn race
   * condition khi 2 request cùng sửa 1 post đồng thời. */
  async lockForUpdate(id, tx) {
    await tx.$queryRaw`SELECT id FROM posts WHERE id = ${id} FOR UPDATE`;
  }

  /**
   * Lock row rồi xác nhận nó chưa bị request khác sửa từ lúc đọc snapshot ban đầu
   * (so sánh updatedAt). Dùng chung cho mọi update-flow cần chống race condition
   * trên Post — tránh mỗi hàm tự viết lại raw SQL + so sánh timestamp.
   * Throw lỗi 409 nếu phát hiện đã bị sửa; không throw thì coi như đã lock xong,
   * an toàn để caller update ngay trong cùng transaction.
   */
  async lockAndAssertFresh(id, expectedUpdatedAt, tx) {
    await this.lockForUpdate(id, tx);
    const fresh = await this.findById(id, tx);
    if (!fresh) {
      const error = new Error('Post not found or unauthorized');
      error.statusCode = 404;
      throw error;
    }
    if (fresh.updatedAt.getTime() !== expectedUpdatedAt.getTime()) {
      const error = new Error('Post was modified by another request during update. Please reload and try again.');
      error.statusCode = 409;
      throw error;
    }
    return fresh;
  }

  async create(data, client = prisma) {
    const cleanData = normalizeWindowsPaths(data);
    try {
      return await client.post.create({
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

  async update(id, data, client = prisma) {
    const cleanData = normalizeWindowsPaths(data);
    try {
      return await client.post.update({
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

  async deleteMany(where, client = prisma) {
    return client.post.deleteMany({ where });
  }

  async updateMany(where, data, client = prisma) {
    const cleanData = normalizeWindowsPaths(data);
    return client.post.updateMany({
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
