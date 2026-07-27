const jwtUtils = require('../../utils/jwt.utils');
const redisClient = require('../../config/redis');

class TokenService {
  /**
   * Generate Access and Refresh tokens, and save Refresh token to Redis
   * @param {Object} user - User object containing id, email, role
   * @returns {Promise<Object>} { accessToken, refreshToken }
   */
  async generateAndSaveTokens(user) {
    const accessToken = jwtUtils.generateAccessToken({
      id: user.id,
      email: user.email,
      role: user.role
    });

    const refreshToken = jwtUtils.generateRefreshToken({
      id: user.id
    });

    // Hash and save refresh token to Redis if available
    const hashedRefreshToken = jwtUtils.hashRefreshToken(refreshToken);
    if (redisClient.isOpen) {
      await redisClient.setEx(
        `refresh:${user.id}`,
        jwtUtils.getRefreshTokenRedisExpiry(),
        hashedRefreshToken
      );
    } else {
      console.warn('Redis is not connected. Refresh token not persisted.');
    }

    return { accessToken, refreshToken };
  }

  /**
   * Remove refresh token from Redis
   * @param {string} userId 
   */
  async clearTokens(userId) {
    if (redisClient.isOpen) {
      await redisClient.del(`refresh:${userId}`);
    }
  }

  /**
   * Verify refresh token against Redis
   * @param {string} userId 
   * @param {string} refreshToken 
   * @returns {Promise<boolean>}
   */
  async verifyRefreshTokenInRedis(userId, refreshToken) {
    if (!redisClient.isOpen) return false;
    const storedHash = await redisClient.get(`refresh:${userId}`);
    const tokenHash = jwtUtils.hashRefreshToken(refreshToken);
    return storedHash === tokenHash;
  }
}

module.exports = new TokenService();
