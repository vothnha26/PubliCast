const authorizationFacade = require('../services/auth/authorization.facade');

/**
 * Middleware to check if the user has access to a brand (is owner or active member)
 */
const checkBrandAccess = async (req, res, next) => {
  const brandId = req.params.brandId || req.query.brandId || req.body?.brandId;
  const userId = req.user?.id;

  if (!brandId) {
    return res.status(400).json({ message: 'Không tìm thấy thông tin thương hiệu (brandId).' });
  }

  if (!userId) {
    return res.status(401).json({ message: 'Không thể xác thực danh tính người dùng.' });
  }

  try {
    const hasAccess = await authorizationFacade.checkBrandAccess(userId, brandId);
    if (!hasAccess) {
      return res.status(403).json({ message: 'Bạn không có quyền truy cập vào thương hiệu này.' });
    }
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = checkBrandAccess;
