const prisma = require('../../config/prisma');

class UserRepository {
  /**
   * Find users with pagination, search, and role filter
   */
  async findAll({ skip, take, search, role }) {
    const where = this._buildWhereClause({ search, role });

    return await prisma.user.findMany({
      where,
      skip,
      take,
      orderBy: {
        createdAt: 'desc'
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        isEmailVerified: true,
        createdAt: true,
        lastLoginAt: true,
        avatarUrl: true
      }
    });
  }

  /**
   * Count users matching the search and role filters
   */
  async count({ search, role }) {
    const where = this._buildWhereClause({ search, role });
    return await prisma.user.count({ where });
  }

  /**
   * Find a single user by ID
   */
  async findById(id) {
    return await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true
      }
    });
  }

  /**
   * Update active status of a user
   */
  async updateStatus(id, isActive) {
    return await prisma.user.update({
      where: { id },
      data: { isActive },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true
      }
    });
  }

  /**
   * Update system role of a user
   */
  async updateRole(id, role) {
    return await prisma.user.update({
      where: { id },
      data: { role },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true
      }
    });
  }

  /**
   * Helper to build Prisma where clause for search and filters
   */
  _buildWhereClause({ search, role }) {
    const where = {};

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } }
      ];
    }

    if (role && role !== 'ALL') {
      where.role = role;
    }

    return where;
  }
}

module.exports = new UserRepository();
