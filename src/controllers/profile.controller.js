const userRepository = require('../repositories/user.repository');

class ProfileController {
  /**
   * Get user profile
   * For /user/profile endpoint
   */
  async getUserProfile(req, res) {
    try {
      const user = await userRepository.findById(req.user.id);

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.status(200).json({
        message: 'User profile retrieved successfully',
        data: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          avatarUrl: user.avatarUrl,
          role: user.role,
          status: user.status,
          createdAt: user.createdAt
        }
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  /**
   * Get admin profile
   * For /admin/profile endpoint
   */
  async getAdminProfile(req, res) {
    try {
      const admin = await userRepository.findById(req.user.id);

      if (!admin) {
        return res.status(404).json({ message: 'Admin not found' });
      }

      res.status(200).json({
        message: 'Admin profile retrieved successfully',
        data: {
          id: admin.id,
          email: admin.email,
          fullName: admin.fullName,
          avatarUrl: admin.avatarUrl,
          role: admin.role,
          status: admin.status,
          createdAt: admin.createdAt
        }
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
}

module.exports = new ProfileController();
