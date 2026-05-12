const userRepository = require('../repositories/user.repository');
const { ERROR_MESSAGES, USER_STATUS } = require('../utils/constants');

class ProfileService {
  /**
   * Edit user profile
   * @param {string} userId - User ID
   * @param {Object} profileData - Data to update { fullName, avatarUrl }
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
    if (user.status === USER_STATUS.BANNED) {
      const error = new Error(ERROR_MESSAGES.ACCOUNT_BANNED);
      error.status = 403;
      throw error;
    }

    // Prepare update data
    const updateData = {};
    if (profileData.fullName !== undefined) {
      updateData.fullName = profileData.fullName.trim();
    }
    if (profileData.avatarUrl !== undefined) {
      updateData.avatarUrl = profileData.avatarUrl;
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
      fullName: updatedUser.fullName,
      avatarUrl: updatedUser.avatarUrl,
      role: updatedUser.role,
      status: updatedUser.status,
      createdAt: updatedUser.createdAt,
      updatedAt: updatedUser.updatedAt
    };
  }
}

module.exports = new ProfileService();
