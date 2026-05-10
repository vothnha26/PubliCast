const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';
const REFRESH_TOKEN_REDIS_EXPIRY = 7 * 24 * 60 * 60; // 7 days in seconds

class JWTUtils {
  /**
   * Generate Access Token
   * @param {Object} payload - { id, email, role }
   * @returns {string} JWT token
   */
  generateAccessToken(payload) {
    return jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, {
      expiresIn: ACCESS_TOKEN_EXPIRY
    });
  }

  /**
   * Generate Refresh Token
   * @param {Object} payload - { id }
   * @returns {string} JWT token
   */
  generateRefreshToken(payload) {
    return jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET, {
      expiresIn: REFRESH_TOKEN_EXPIRY
    });
  }

  /**
   * Hash refresh token using SHA-256
   * @param {string} token - refresh token
   * @returns {string} hashed token
   */
  hashRefreshToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Verify Access Token
   * @param {string} token - JWT token
   * @returns {Object} decoded payload
   */
  verifyAccessToken(token) {
    try {
      return jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Access token expired');
      }
      throw new Error('Invalid access token');
    }
  }

  /**
   * Verify Refresh Token
   * @param {string} token - JWT token
   * @returns {Object} decoded payload
   */
  verifyRefreshToken(token) {
    try {
      return jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Refresh token expired');
      }
      throw new Error('Invalid refresh token');
    }
  }

  /**
   * Get token expiry time in milliseconds
   * @param {string} type - 'access' or 'refresh'
   * @returns {number} milliseconds
   */
  getTokenExpiry(type) {
    if (type === 'access') {
      return 15 * 60 * 1000; // 15 minutes
    }
    if (type === 'refresh') {
      return 7 * 24 * 60 * 60 * 1000; // 7 days
    }
    return 0;
  }

  /**
   * Get refresh token Redis expiry
   * @returns {number} seconds
   */
  getRefreshTokenRedisExpiry() {
    return REFRESH_TOKEN_REDIS_EXPIRY;
  }

  /**
   * Extract token from cookie or header
   * @param {string} authHeader - Authorization header value
   * @returns {string|null} token
   */
  extractToken(authHeader) {
    if (!authHeader) return null;
    const parts = authHeader.split(' ');
    if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
      return parts[1];
    }
    return null;
  }
}

module.exports = new JWTUtils();
