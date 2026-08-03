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
          },
          networkOverrides: true,
          targets: true
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
        },
        networkOverrides: true,
        targets: true
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
      },
      include: {
        networkOverrides: true,
        targets: true
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

  /**
   * Atomically claim a post for publishing (compare-and-swap): only
   * transitions status -> PUBLISHING if it's currently one of fromStatuses.
   * BullMQ's jobId dedup only blocks duplicate jobs still sitting in the
   * queue — a manual retry that lands while a scheduled job is already
   * mid-publish (removed can't touch an active job) previously fell through
   * to a second concurrent publishToPlatforms call with no DB-level guard.
   * This closes that gap (#54).
   * @returns {Promise<boolean>} true if this caller won the claim.
   */
  async claimForPublishing(id, fromStatuses, client = prisma) {
    const result = await client.post.updateMany({
      where: { id, status: { in: fromStatuses } },
      data: { status: 'PUBLISHING' }
    });
    return result.count === 1;
  }

  /**
   * Finds posts stuck at RETRYING whose updatedAt is older than thresholdMs —
   * candidates for the publish-reconciler sweeper. A post reaches RETRYING
   * only via UpdatePostStatusStep, which always immediately self-enqueues a
   * partial-retry job (or throws so BullMQ retries the whole job) right
   * after; a post still RETRYING well past that point means the job it was
   * relying on got lost (Redis restart, or a #106 active-job dedup skip) with
   * nothing left to move it forward (#107 I7).
   */
  async findStaleRetrying(thresholdMs, limit = 50, client = prisma) {
    const cutoff = new Date(Date.now() - thresholdMs);
    return client.post.findMany({
      where: { status: 'RETRYING', updatedAt: { lt: cutoff } },
      orderBy: { updatedAt: 'asc' },
      take: limit
    });
  }

  async countActivePostsThisMonth(brandId, client = prisma) {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    return client.post.count({
      where: {
        brandId,
        createdAt: { gte: startOfMonth },
        isDeleted: false
      }
    });
  }
}

module.exports = new PostRepository();
