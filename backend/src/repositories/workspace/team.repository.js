const prisma = require('../../config/prisma');

class TeamRepository {
  /**
   * Find team members with filters
   */
  async findManyAndCount(where, options = {}) {
    const { skip = 0, take = 50, orderBy = { createdAt: 'desc' } } = options;

    const [members, total] = await Promise.all([
      prisma.team.findMany({
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
              avatarUrl: true
            }
          },
          invitedBy: {
            select: {
              name: true
            }
          },
          customRole: true
        }
      }),
      prisma.team.count({ where })
    ]);

    return { members, total };
  }

  async findById(id) {
    return prisma.team.findUnique({
      where: { id },
      include: {
        user: true,
        brand: true,
        customRole: true
      }
    });
  }

  async findByBrandAndUserId(brandId, userId) {
    return prisma.team.findUnique({
      where: {
        brandId_userId: {
          brandId,
          userId
        }
      },
      include: {
        user: true,
        brand: true,
        customRole: true
      }
    });
  }

  async create(data) {
    return prisma.team.create({
      data,
      include: {
        user: true,
        brand: true,
        customRole: true
      }
    });
  }

  async update(id, data) {
    return prisma.team.update({
      where: { id },
      data,
      include: {
        user: true,
        brand: true,
        customRole: true
      }
    });
  }

  async delete(id) {
    return prisma.team.delete({
      where: { id }
    });
  }

  async countMembersByBrand(brandId) {
    return prisma.team.count({
      where: { brandId }
    });
  }

  /**
   * Atomically activates a PENDING invitation. The WHERE clause requires
   * status: 'PENDING', so if two acceptInvitation requests race (e.g. a
   * double-submit), only the first UPDATE actually matches a row — the
   * second gets count: 0 instead of silently re-activating an already-active
   * invite or overwriting fields a moment later.
   */
  async activateIfPending(id) {
    return prisma.team.updateMany({
      where: { id, status: 'PENDING' },
      data: { status: 'ACTIVE', acceptedAt: new Date() }
    });
  }
}

module.exports = new TeamRepository();
