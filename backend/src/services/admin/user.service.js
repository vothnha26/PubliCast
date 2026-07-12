const userRepository = require('../../repositories/admin/user.repository');

class UserService {
  /**
   * Get paginated users with filters
   */
  async getUsers({ page = 1, limit = 10, search = '', role = '' }) {
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    const skip = (pageNum - 1) * limitNum;

    const [users, total] = await Promise.all([
      userRepository.findAll({ skip, take: limitNum, search, role }),
      userRepository.count({ search, role })
    ]);

    const totalPages = Math.ceil(total / limitNum) || 1;

    return {
      data: users,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages
      }
    };
  }

  /**
   * Toggle user active status (ban/unban)
   */
  async updateUserStatus(adminId, targetId, isActive) {
    if (adminId === targetId) {
      throw new Error('Bạn không thể tự vô hiệu hóa tài khoản của chính mình');
    }

    const user = await userRepository.findById(targetId);
    if (!user) {
      throw new Error('Không tìm thấy người dùng');
    }

    return await userRepository.updateStatus(targetId, isActive);
  }

  /**
   * Change user system role
   */
  async updateUserRole(adminId, targetId, role) {
    if (adminId === targetId) {
      throw new Error('Bạn không thể tự thay đổi vai trò của chính mình');
    }

    const user = await userRepository.findById(targetId);
    if (!user) {
      throw new Error('Không tìm thấy người dùng');
    }

    // Xác nhận role hợp lệ
    const validRoles = [
      'OWNER', 'ADMIN', 'MANAGER', 'STAFF', 'USER', 'EDITOR',
      'VIEWER', 'ANALYST', 'STREAM_MANAGER', 'CONTENT_MANAGER',
      'CONTENT_CREATOR', 'STREAM_OPERATOR', 'CLIENT'
    ];
    
    if (!validRoles.includes(role)) {
      throw new Error('Vai trò hệ thống không hợp lệ');
    }

    return await userRepository.updateRole(targetId, role);
  }
}

module.exports = new UserService();
