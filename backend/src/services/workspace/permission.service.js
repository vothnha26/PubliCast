const prisma = require('../../config/prisma');

class PermissionService {
  async getPermissions() {
    return prisma.systemPermission.findMany({
      orderBy: { createdAt: 'asc' }
    });
  }

  async createPermission(data) {
    const { key, label, description, category } = data;
    if (!key || !label) {
      const error = new Error('Khóa (key) và nhãn (label) quyền là bắt buộc.');
      error.status = 400;
      throw error;
    }

    const uppercaseKey = key.toUpperCase();
    const existing = await prisma.systemPermission.findUnique({
      where: { key: uppercaseKey }
    });

    if (existing) {
      const error = new Error('Khóa quyền này đã tồn tại trong hệ thống.');
      error.status = 400;
      throw error;
    }

    return prisma.systemPermission.create({
      data: {
        key: uppercaseKey,
        label,
        description,
        category: category || 'management'
      }
    });
  }

  async deletePermission(key) {
    const uppercaseKey = key.toUpperCase();
    const existing = await prisma.systemPermission.findUnique({
      where: { key: uppercaseKey }
    });

    if (!existing) {
      const error = new Error('Không tìm thấy khóa quyền này.');
      error.status = 404;
      throw error;
    }

    // Delete associated CustomRolePermission records first to maintain integrity
    await prisma.customRolePermission.deleteMany({
      where: { permissionKey: uppercaseKey }
    });

    await prisma.systemPermission.delete({
      where: { key: uppercaseKey }
    });

    return { message: 'Xóa quyền hệ thống thành công.' };
  }
}

module.exports = new PermissionService();
