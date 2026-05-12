const jwtUtils = require('../utils/jwt.utils');

/**
 * Verify JWT token from cookies
 */
const verifyAuth = (req, res, next) => {
  try {
    // Get token from cookie or Authorization header
    const token = req.cookies?.accessToken || jwtUtils.extractToken(req.headers.authorization);

    if (!token) {
      return res.status(401).json({ message: 'Access token required' });
    }

    // Verify token
    const decoded = jwtUtils.verifyAccessToken(token);

    // Attach user info to request
    req.user = decoded;
    next();
  } catch (error) {
    if (error.message === 'Access token expired') {
      return res.status(401).json({ message: 'Access token expired. Please refresh.' });
    }
    res.status(403).json({ message: 'Invalid or expired token' });
  }
};

module.exports = {
  verifyAuth
};
