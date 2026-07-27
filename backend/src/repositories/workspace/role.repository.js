const prisma = require('../../config/prisma');

class RoleRepository {
  /**
   * Find all custom roles for a brand
   */
  async findManyByBrandId(brandId) {
    return prisma.customRole.findMany({
      where: { brandId },
      include: {
        permissions: true,
        _count: {
          select: { teamMembers: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Find a custom role by ID
   */
  async findById(id) {
    return prisma.customRole.findUnique({
      where: { id },
      include: {
        permissions: true,
        _count: {
          select: { teamMembers: true }
        }
      }
    });
  }

  /**
   * Find custom role by name in a brand
   */
  async findByName(brandId, name) {
    return prisma.customRole.findFirst({
      where: {
        brandId,
        name: { equals: name }
      }
    });
  }

  /**
   * Create custom role with permissions in a transaction
   */
  async create({ brandId, name, description, colorHex, permissions = [] }) {
    return prisma.$transaction(async (tx) => {
      const role = await tx.customRole.create({
        data: {
          brandId,
          name,
          description,
          colorHex
        }
      });

      if (permissions.length > 0) {
        await tx.customRolePermission.createMany({
          data: permissions.map(p => ({
            roleId: role.id,
            permissionKey: p.permissionKey,
            isAllowed: p.isAllowed ?? true
          }))
        });
      }

      return tx.customRole.findUnique({
        where: { id: role.id },
        include: { permissions: true }
      });
    });
  }

  /**
   * Update custom role and its permissions in a transaction
   */
  async update(id, { name, description, colorHex, permissions }) {
    return prisma.$transaction(async (tx) => {
      const role = await tx.customRole.update({
        where: { id },
        data: {
          name,
          description,
          colorHex
        }
      });

      if (permissions) {
        // Delete all old permissions for this role
        await tx.customRolePermission.deleteMany({
          where: { roleId: id }
        });

        // Insert new permissions
        if (permissions.length > 0) {
          await tx.customRolePermission.createMany({
            data: permissions.map(p => ({
              roleId: id,
              permissionKey: p.permissionKey,
              isAllowed: p.isAllowed ?? true
            }))
          });
        }
      }

      return tx.customRole.findUnique({
        where: { id },
        include: { permissions: true }
      });
    });
  }

  /**
   * Delete custom role
   */
  async delete(id) {
    return prisma.customRole.delete({
      where: { id }
    });
  }
}

module.exports = new RoleRepository();
