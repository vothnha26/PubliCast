const { USER_ROLES } = require('../utils/constants');
const logger = require('../utils/logger');

/**
 * Middleware factory to check user role.
 * @param {...string} allowedRoles - roles that have access
 * @returns {Function} express middleware
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    // User must be authenticated first (verifyAuth middleware should be applied before)
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const roleData = req.user.role;
    // Handle both string role (from new tokens) and object role (for backward compatibility if needed)
    const userRole = (typeof roleData === 'string' ? roleData : roleData?.name)?.toUpperCase();

    if (!userRole || !allowedRoles.includes(userRole)) {
      const rolesList = allowedRoles.filter(Boolean).join(', ');
      logger.warn('Access denied', { userId: req.user.id, userRole, requiredRoles: rolesList, url: req.url });
      return res.status(403).json({
        message: `Access denied. Only ${rolesList} roles are allowed.`
      });
    }

    next();
  };
};

/**
 * Only ADMIN / OWNER access
 */
const authorizeAdmin = authorize(USER_ROLES.ADMIN, USER_ROLES.OWNER);

/**
 * Only MANAGER access
 */
const authorizeManager = authorize(USER_ROLES.MANAGER);

/**
 * Only USER access
 */
const authorizeUser = authorize(USER_ROLES.USER);

/**
 * All authenticated roles can access
 */
const authorizeAny = authorize(
  USER_ROLES.OWNER,
  USER_ROLES.ADMIN, 
  USER_ROLES.MANAGER, 
  USER_ROLES.STAFF, 
  USER_ROLES.USER,
  USER_ROLES.EDITOR,
  USER_ROLES.VIEWER,
  USER_ROLES.ANALYST,
  USER_ROLES.STREAM_MANAGER,
  USER_ROLES.CONTENT_MANAGER,
  USER_ROLES.CONTENT_CREATOR,
  USER_ROLES.STREAM_OPERATOR,
  USER_ROLES.CLIENT
);

module.exports = {
  authorize,
  authorizeAdmin,
  authorizeManager,
  authorizeUser,
  authorizeAny
};
