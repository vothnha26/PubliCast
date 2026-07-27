const prisma = require('../../config/prisma');

class SearchRepository {
  /**
   * Search all entities for Admin role
   */
  async searchAllForAdmin(q) {
    const searchKey = q.trim();

    const [users, brands, logs] = await Promise.all([
      // Search all users
      prisma.user.findMany({
        where: {
          OR: [
            { name: { contains: searchKey } },
            { email: { contains: searchKey } }
          ]
        },
        select: { id: true, name: true, email: true, role: true, avatarUrl: true },
        take: 5
      }),

      // Search all brands
      prisma.brand.findMany({
        where: {
          name: { contains: searchKey }
        },
        select: { id: true, name: true },
        take: 5
      }),

      // Search all audit logs
      prisma.auditLog.findMany({
        where: {
          OR: [
            { action: { contains: searchKey } },
            { targetType: { contains: searchKey } },
            { targetId: { contains: searchKey } },
            { ipAddress: { contains: searchKey } }
          ]
        },
        include: {
          user: { select: { name: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: 5
      })
    ]);

    return { users, brands, logs };
  }

  /**
   * Search limited entities for non-Admin users (role OWNER/MEMBER/etc.)
   */
  async searchAllForUser(q, userId) {
    const searchKey = q.trim();

    // 1. Get all brands this user is owner of or team member in
    const userBrands = await prisma.brand.findMany({
      where: {
        OR: [
          { ownerId: userId },
          { teamMembers: { some: { userId: userId } } }
        ]
      },
      select: { id: true }
    });

    const brandIds = userBrands.map(b => b.id);

    // If the user is not associated with any brands, return empty lists
    if (brandIds.length === 0) {
      return { users: [], brands: [], logs: [] };
    }

    const [users, brands, logs] = await Promise.all([
      // 2. Search users in same brands/teams
      prisma.user.findMany({
        where: {
          OR: [
            { name: { contains: searchKey } },
            { email: { contains: searchKey } }
          ],
          AND: [
            {
              OR: [
                { id: userId }, // self
                { brands: { some: { id: { in: brandIds } } } },
                { teamMembers: { some: { brandId: { in: brandIds } } } }
              ]
            }
          ]
        },
        select: { id: true, name: true, email: true, role: true, avatarUrl: true },
        take: 5
      }),

      // 3. Search only their brands
      prisma.brand.findMany({
        where: {
          id: { in: brandIds },
          name: { contains: searchKey }
        },
        select: { id: true, name: true },
        take: 5
      }),

      // 4. Search audit logs within their brands or actions performed by themselves
      prisma.auditLog.findMany({
        where: {
          OR: [
            { brandId: { in: brandIds } },
            { userId: userId }
          ],
          AND: [
            {
              OR: [
                { action: { contains: searchKey } },
                { targetType: { contains: searchKey } },
                { targetId: { contains: searchKey } }
              ]
            }
          ]
        },
        include: {
          user: { select: { name: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: 5
      })
    ]);

    return { users, brands, logs };
  }
}

module.exports = new SearchRepository();
