const jwtUtils = require('../utils/jwt.utils');
const logger = require('../utils/logger');

/**
 * Verify a token and attach req.user, or respond with the standard auth error.
 */
const verifyToken = (token, req, res, next) => {
  try {
    if (!token) {
      logger.warn('Auth failed: no token provided', { method: req.method, url: req.url });
      return res.status(401).json({ message: 'Access token required' });
    }

    const decoded = jwtUtils.verifyAccessToken(token);
    logger.debug('Auth success', { userId: decoded.id, role: decoded.role });

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

/**
 * Verify JWT token from cookies or Authorization header.
 * Sets req.user = decoded payload on success.
 */
const verifyAuth = (req, res, next) => {
  const token = req.cookies?.accessToken ||
                jwtUtils.extractToken(req.headers.authorization);
  verifyToken(token, req, res, next);
};

/**
 * Same as verifyAuth but also accepts a ?token= query parameter.
 * Query strings leak into server/proxy logs, browser history, and the
 * Referer header, so this must only be mounted on the specific
 * SSE/EventSource routes that have no way to send an Authorization header —
 * never as a general-purpose auth middleware.
 */
const verifyAuthFromQuery = (req, res, next) => {
  const token = req.cookies?.accessToken ||
                jwtUtils.extractToken(req.headers.authorization) ||
                req.query.token;
  verifyToken(token, req, res, next);
};

module.exports = {
  verifyAuth,
  verifyAuthFromQuery
};

