const authorizationFacade = require('../services/auth/authorization.facade');

/**
 * Middleware to check if the user has a specific permission
 * @param {string} permissionKey - e.g., 'CREATE_POSTS', 'MANAGE_ROLES'
 */
const checkPermission = (permissionKey) => {
  return async (req, res, next) => {
    // Extract brandId from params, query, or request body
    const brandId = req.params.brandId || req.query.brandId || req.body?.brandId;
    const userId = req.user?.id;

    if (!brandId) {
      return res.status(400).json({ message: 'Không tìm thấy thông tin thương hiệu (brandId).' });
    }

    if (!userId) {
      return res.status(401).json({ message: 'Không thể xác thực danh tính người dùng.' });
    }

    try {
      const hasAccess = await authorizationFacade.checkPermission(userId, brandId, permissionKey);
      if (!hasAccess) {
        return res.status(403).json({ message: 'Bạn không có quyền thực hiện thao tác này.' });
      }
      next();
    } catch (err) {
      next(err);
    }
  };
};

/**
 * Middleware requiring the caller to be the brand owner or an active team member,
 * without needing any specific permission key. Use for read-only routes that any
 * member should see regardless of what they're allowed to change (e.g. viewing the
 * brand's current plan/payment history vs. actually upgrading it). Unlike
 * checkPermission, this isn't a factory — use it directly in a route chain.
 */
const requireBrandMember = async (req, res, next) => {
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
      return res.status(403).json({ message: 'Bạn không có quyền truy cập thương hiệu này.' });
    }
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = checkPermission;
module.exports.requireBrandMember = requireBrandMember;
