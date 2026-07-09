const jwtUtils = require('../utils/jwt.utils');
const logger = require('../utils/logger');

/**
 * Verify JWT token from cookies or Authorization header.
 * Sets req.user = decoded payload on success.
 */
const verifyAuth = (req, res, next) => {
  try {
    console.log(`[BACKEND DEBUG verifyAuth] Path: ${req.url}, Cookies:`, req.cookies, `Authorization:`, req.headers.authorization);
    // Get token from cookie or Authorization header
    const token = req.cookies?.accessToken || jwtUtils.extractToken(req.headers.authorization);

    if (!token) {
      logger.warn('Auth failed: no token provided', { method: req.method, url: req.url });
      return res.status(401).json({ message: 'Access token required' });
    }

    // Verify token
    const decoded = jwtUtils.verifyAccessToken(token);
    logger.debug('Auth success', { userId: decoded.id, role: decoded.role });

    // Attach user info to request
    req.user = decoded;
    next();
  } catch (error) {
    if (error.message === 'Access token expired') {
      return res.status(401).json({ message: 'Access token expired. Please refresh.' });
    }
    logger.warn('Auth failed: invalid token', { error: error.message, url: req.url });
    res.status(403).json({ message: 'Invalid or expired token' });
  }
};

module.exports = {
  verifyAuth
};

