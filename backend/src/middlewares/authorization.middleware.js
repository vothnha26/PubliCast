const { USER_ROLES } = require('../utils/constants');

/**
 * Middleware factory to check user role
 * @param {...string} allowedRoles - roles that have access
 * @returns {Function} express middleware
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    // User must be authenticated first (verifyAuth middleware should be applied before)
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const userRole = req.user.role?.toUpperCase();

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        message: `Access denied. Only ${allowedRoles.join(', ')} roles are allowed.`
      });
    }

    next();
  };
};

/**
 * Only ADMIN access
 */
const authorizeAdmin = authorize(USER_ROLES.ADMIN);

/**
 * Only USER access
 */
const authorizeUser = authorize(USER_ROLES.USER);

/**
 * ADMIN and USER access
 */
const authorizeAny = authorize(USER_ROLES.ADMIN, USER_ROLES.USER);

module.exports = {
  authorize,
  authorizeAdmin,
  authorizeUser,
  authorizeAny
};
