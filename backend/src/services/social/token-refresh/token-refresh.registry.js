const { PLATFORMS } = require('../../../utils/constants');
const FacebookTokenRefreshStrategy = require('./strategies/facebook-token-refresh.strategy');
const ThreadsTokenRefreshStrategy = require('./strategies/threads-token-refresh.strategy');

class TokenRefreshRegistry {
  constructor() {
    this._strategies = new Map();
    this._init();
  }

  _init() {
    const facebookStrategy = new FacebookTokenRefreshStrategy();
    const threadsStrategy = new ThreadsTokenRefreshStrategy();

    this._register(facebookStrategy);
    this._register(threadsStrategy);

    // Instagram uses the same Facebook Page Access Token, so we map it to the Facebook strategy
    this._strategies.set(PLATFORMS.INSTAGRAM, facebookStrategy);
  }

  _register(strategy) {
    this._strategies.set(strategy.platform, strategy);
  }

  /**
   * Lấy strategy làm mới token cho platform tương ứng.
   * @param {string} platform
   * @returns {BaseTokenRefreshStrategy|null}
   */
  getStrategy(platform) {
    return this._strategies.get(platform) || null;
  }

  /**
   * Trả về danh sách các platform được hỗ trợ tự động làm mới.
   * @returns {string[]}
   */
  getSupportedPlatforms() {
    return Array.from(this._strategies.keys());
  }
}

module.exports = new TokenRefreshRegistry();
