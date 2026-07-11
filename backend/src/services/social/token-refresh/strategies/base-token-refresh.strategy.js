class BaseTokenRefreshStrategy {
  /**
   * @param {string} platform - Hằng số platform từ constants
   */
  constructor(platform) {
    if (!platform) {
      throw new Error('Platform identifier is required for BaseTokenRefreshStrategy');
    }
    this.platform = platform;
  }

  /**
   * Kiểm tra xem platform này có hỗ trợ refresh token không.
   * @param {Object} account - Bản ghi SocialAccount từ DB
   * @returns {boolean}
   */
  canRefresh(account) {
    return true;
  }

  /**
   * Thực hiện làm mới token.
   * @param {Object} account - Bản ghi SocialAccount từ DB
   * @returns {Promise<{ accessToken: string, refreshToken: string|null, expiresAt: Date|null }>}
   */
  async refresh(account) {
    throw new Error(`Method 'refresh' must be implemented for strategy: ${this.platform}`);
  }
}

module.exports = BaseTokenRefreshStrategy;
