const userRepository = require('../../repositories/auth/user.repository');
const brandService = require('../../services/workspace/brand.service');
const brandRepository = require('../../repositories/workspace/brand.repository');
const tokenService = require('./token.service');
const { ERROR_MESSAGES } = require('../../utils/constants');

class ProfileService {
  /**
   * Get user profile with auto-healing brand logic
   */
  async getUserProfile(userId) {
    const user = await userRepository.findById(userId);
    if (!user) {
      const error = new Error(ERROR_MESSAGES.USER_NOT_FOUND || 'User not found');
      error.status = 404;
      throw error;
    }

    // Business Logic: Self-healing for brands
    const brands = await brandService.getUserBrands(userId);
    if (brands.length === 0) {
      try {
        console.log(`Auto-creating brand for user ${userId}`);
        await brandService.createDefaultBrand(userId);
      } catch (err) {
        console.error(`Brand auto-creation failed: ${err.message}`);
      }
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      fullName: user.name,
      avatarUrl: user.avatarUrl,
      phone: user.phone,
      address: user.address,
      industry: user.industry,
      bio: user.bio,
      role: user.role,
      isActive: user.isActive,
      isEmailVerified: user.isEmailVerified,
      isTwoFactorEnabled: user.isTwoFactorEnabled,
      createdAt: user.createdAt,
      defaultBrandId: user.defaultBrandId || null,
      accounts: user.accounts.map(acc => ({
        id: acc.id,
        provider: acc.provider,
        providerId: acc.providerId,
        createdAt: acc.createdAt,
        lastLoginAt: acc.lastLoginAt
      }))
    };
  }

  /**
   * Edit user profile
   * @param {string} userId - User ID
   * @param {Object} profileData - Data to update { name, avatarUrl, phone, address, industry, bio }
   * @returns {Promise<Object>} - Updated user object
   */
  async editProfile(userId, profileData) {
    // Check if user exists
    const user = await userRepository.findById(userId);
    if (!user) {
      const error = new Error(ERROR_MESSAGES.USER_NOT_FOUND || 'User not found');
      error.status = 404;
      throw error;
    }

    // Check if account is banned
    if (!user.isActive) {
      const error = new Error(ERROR_MESSAGES.ACCOUNT_BANNED);
      error.status = 403;
      throw error;
    }

    // Prepare update data
    const updateData = {};
    if (profileData.fullName !== undefined) {
      updateData.name = profileData.fullName.trim();
    }
    if (profileData.name !== undefined) {
      updateData.name = profileData.name.trim();
    }
    if (profileData.avatarUrl !== undefined) {
      updateData.avatarUrl = profileData.avatarUrl;
    }
    if (profileData.phone !== undefined) {
      updateData.phone = profileData.phone.trim() || null;
    }
    if (profileData.address !== undefined) {
      updateData.address = profileData.address.trim() || null;
    }
    if (profileData.industry !== undefined) {
      updateData.industry = profileData.industry.trim() || null;
    }
    if (profileData.bio !== undefined) {
      updateData.bio = profileData.bio.trim() || null;
    }

    // If nothing to update
    if (Object.keys(updateData).length === 0) {
      const error = new Error('No data to update');
      error.status = 400;
      throw error;
    }

    // Update user profile
    const updatedUser = await userRepository.updateProfile(userId, updateData);

    return {
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      fullName: updatedUser.name,
      avatarUrl: updatedUser.avatarUrl,
      phone: updatedUser.phone,
      address: updatedUser.address,
      industry: updatedUser.industry,
      bio: updatedUser.bio,
      role: updatedUser.role,
      isActive: updatedUser.isActive,
      isEmailVerified: updatedUser.isEmailVerified,
      createdAt: updatedUser.createdAt,
      updatedAt: updatedUser.updatedAt
    };
  }

  /**
   * Unlink social provider account
   * @param {string} userId
   * @param {string} provider
   */
  async unlinkAccount(userId, provider) {
    const prisma = require('../../config/prisma');

    // 1. Fetch user to verify accounts count
    const user = await userRepository.findById(userId);
    if (!user) {
      const error = new Error('User not found');
      error.status = 404;
      throw error;
    }

    if (user.accounts.length <= 1) {
      const error = new Error('Bạn không thể hủy liên kết phương thức đăng nhập duy nhất.');
      error.status = 400;
      throw error;
    }

    // 2. Delete the account of this provider
    await prisma.userAccount.deleteMany({
      where: {
        userId,
        provider: provider.toUpperCase()
      }
    });

    return { message: `Hủy liên kết tài khoản ${provider} thành công` };
  }

  /**
   * Change user password
   * @param {string} userId
   * @param {string} currentPassword
   * @param {string} newPassword
   */
  async changePassword(userId, currentPassword, newPassword) {
    const bcrypt = require('bcryptjs');
    const prisma = require('../../config/prisma');

    // 1. Fetch user accounts
    const localAccount = await prisma.userAccount.findFirst({
      where: {
        userId,
        provider: 'LOCAL'
      }
    });

    // 2. If LOCAL account exists, verify current password
    if (localAccount && localAccount.passwordHash) {
      if (!currentPassword) {
        const error = new Error('Mật khẩu hiện tại là bắt buộc.');
        error.status = 400;
        throw error;
      }

      const isMatch = await bcrypt.compare(currentPassword, localAccount.passwordHash);
      if (!isMatch) {
        const error = new Error('Mật khẩu hiện tại không chính xác.');
        error.status = 400;
        throw error;
      }
    }

    // 3. Hash new password
    const salt = await bcrypt.genSalt(10);
    const newPasswordHash = await bcrypt.hash(newPassword, salt);

    // 4. Update or create LOCAL account
    if (localAccount) {
      await prisma.userAccount.update({
        where: { id: localAccount.id },
        data: { passwordHash: newPasswordHash }
      });
    } else {
      // First-time password setup for social logins
      await prisma.userAccount.create({
        data: {
          userId,
          provider: 'LOCAL',
          passwordHash: newPasswordHash
        }
      });
    }

    // Revoke existing refresh tokens so a change made because the account
    // was suspected compromised actually locks the attacker out. Without
    // this, an attacker's refresh token in Redis (refresh:${userId}) stayed
    // valid for its full 7-day TTL even after the victim changed their
    // password (#80) — resetPasswordWithToken already does this correctly.
    await tokenService.clearTokens(userId);

    return { message: 'Thay đổi mật khẩu thành công' };
  }

  /**
   * Set default brand for user
   * @param {string} userId
   * @param {string|null} defaultBrandId - Brand ID to set as default, or null to clear
   */
  async setDefaultBrand(userId, defaultBrandId) {
    // Validate user exists
    const user = await userRepository.findById(userId);
    if (!user) {
      const error = new Error(ERROR_MESSAGES.USER_NOT_FOUND || 'User not found');
      error.status = 404;
      throw error;
    }

    // If clearing default brand
    if (!defaultBrandId || defaultBrandId === 'NONE') {
      await userRepository.updateProfile(userId, { defaultBrandId: null });
      return { message: 'Đã xóa thương hiệu mặc định', defaultBrandId: null };
    }

    // Validate user can access this brand
    const canAccess = await brandRepository.userCanAccessBrand(userId, defaultBrandId);
    if (!canAccess) {
      const error = new Error('Bạn không có quyền truy cập thương hiệu này');
      error.status = 403;
      throw error;
    }

    await userRepository.updateProfile(userId, { defaultBrandId });
    return { message: 'Đã thiết lập thương hiệu mặc định thành công', defaultBrandId };
  }
}

module.exports = new ProfileService();
