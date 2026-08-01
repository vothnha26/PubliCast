const profileService = require('../../services/auth/profile.service');
const { v2Success } = require('../../utils/response.helper');

/**
 * Profile Controller V2 - Enforces Standardized Envelope Responses: { message, data }
 */
class ProfileControllerV2 {
  async getUserProfile(req, res, next) {
    try {
      const result = await profileService.getUserProfile(req.user.id);
      return v2Success(res, result, 'User profile fetched successfully.');
    } catch (err) {
      next(err);
    }
  }

  async getAdminProfile(req, res, next) {
    try {
      const result = await profileService.getAdminProfile(req.user.id);
      return v2Success(res, result, 'Admin profile fetched successfully.');
    } catch (err) {
      next(err);
    }
  }

  async editProfile(req, res, next) {
    try {
      const result = await profileService.editProfile(req.user.id, req.body);
      return v2Success(res, result, 'Profile updated successfully.');
    } catch (err) {
      next(err);
    }
  }

  async uploadAvatar(req, res, next) {
    try {
      const result = await profileService.uploadAvatar(req.user.id, req.file);
      return v2Success(res, result, 'Avatar uploaded successfully.');
    } catch (err) {
      next(err);
    }
  }

  async unlinkAccount(req, res, next) {
    try {
      const { provider } = req.params;
      const result = await profileService.unlinkAccount(req.user.id, provider);
      return v2Success(res, result, `Unlinked ${provider} account successfully.`);
    } catch (err) {
      next(err);
    }
  }

  async changePassword(req, res, next) {
    try {
      const { currentPassword, newPassword } = req.body;
      if (!newPassword || newPassword.length < 8) {
        return res.status(400).json({ message: 'Mật khẩu mới phải có ít nhất 8 ký tự.' });
      }
      const result = await profileService.changePassword(req.user.id, currentPassword, newPassword);
      return v2Success(res, result, 'Password changed successfully.');
    } catch (err) {
      next(err);
    }
  }

  async setDefaultBrand(req, res, next) {
    try {
      const { brandId } = req.body;
      const result = await profileService.setDefaultBrand(req.user.id, brandId);
      return v2Success(res, result, 'Default brand set successfully.');
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new ProfileControllerV2();
