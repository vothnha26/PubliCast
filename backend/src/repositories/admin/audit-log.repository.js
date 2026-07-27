const prisma = require('../../config/prisma');

class AuditLogRepository {
  /**
   * Find audit logs matching criteria with pagination and user info included
   * @param {Object} where - Prisma where conditions
   * @param {Object} options - { skip, take, orderBy }
   * @returns {Promise<Object>} { logs, total }
   */
  async findManyAndCount(where, options = {}) {
    const { skip = 0, take = 10, orderBy = { createdAt: 'desc' } } = options;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
              role: true
            }
          }
        }
      }),
      prisma.auditLog.count({ where })
    ]);

    return { logs, total };
  }
}

module.exports = new AuditLogRepository();
