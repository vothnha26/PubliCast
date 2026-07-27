const prisma = require('../../../config/prisma');
const socialAccountRepository = require('../../../repositories/social/social-account.repository');
const tokenRefreshRegistry = require('./token-refresh.registry');
const { TOKEN_REFRESH_CONSTANTS } = require('./constants/token-refresh.constants');
const logger = require('../../../utils/logger');

class TokenRefreshService {
  constructor() {
    this._intervalId = null;
  }

  /**
   * Khởi chạy bộ lập lịch chạy định kỳ (scheduler).
   */
  startScheduler() {
    if (this._intervalId) {
      logger.warn('[TokenRefreshService] Scheduler is already running');
      return;
    }

    // Delay khởi chạy lần đầu tiên để hệ thống khởi động ổn định
    setTimeout(() => {
      logger.info('[TokenRefreshService] Running initial token refresh scan...');
      this.refreshExpiringSoon().catch(err => {
        logger.error('[TokenRefreshService] Error in initial token refresh:', err);
      });
    }, TOKEN_REFRESH_CONSTANTS.STARTUP_DELAY_MS);

    // Chạy định kỳ
    this._intervalId = setInterval(() => {
      logger.info('[TokenRefreshService] Running scheduled token refresh scan...');
      this.refreshExpiringSoon().catch(err => {
        logger.error('[TokenRefreshService] Error in scheduled token refresh:', err);
      });
    }, TOKEN_REFRESH_CONSTANTS.SCHEDULER_INTERVAL_MS);

    logger.info(`[TokenRefreshService] Scheduler started with interval: ${TOKEN_REFRESH_CONSTANTS.SCHEDULER_INTERVAL_MS}ms`);
  }

  /**
   * Dừng bộ lập lịch.
   */
  stopScheduler() {
    if (this._intervalId) {
      clearInterval(this._intervalId);
      this._intervalId = null;
      logger.info('[TokenRefreshService] Scheduler stopped');
    }
  }

  /**
   * Thực hiện quét cơ sở dữ liệu và refresh các token sắp hết hạn.
   */
  async refreshExpiringSoon() {
    const lookaheadDate = new Date(
      Date.now() + TOKEN_REFRESH_CONSTANTS.LOOKHEAD_DAYS * 24 * 60 * 60 * 1000
    );

    const supportedPlatforms = tokenRefreshRegistry.getSupportedPlatforms();

    // Lấy tất cả các account đang kết nối, thuộc platform được hỗ trợ và có hạn token <= lookaheadDate
    const accounts = await prisma.socialAccount.findMany({
      where: {
        isConnected: true,
        platform: { in: supportedPlatforms },
        tokenExpiresAt: { lte: lookaheadDate },
        NOT: { accessToken: { startsWith: 'mock-' } }
      }
    });

    logger.info(`[TokenRefreshService] Found ${accounts.length} account(s) expiring soon (before ${lookaheadDate.toISOString()})`);

    for (const encryptedAccount of accounts) {
      // Giải mã token trước khi đưa vào strategy xử lý
      const account = socialAccountRepository._decryptAccount(encryptedAccount);
      await this.refreshAccount(account);
    }
  }

  /**
   * Làm mới token cho một tài khoản cụ thể (chủ động hoặc reactive).
   * @param {Object} account - Tài khoản mạng xã hội (đã giải mã tokens)
   */
  async refreshAccount(account) {
    const strategy = tokenRefreshRegistry.getStrategy(account.platform);
    if (!strategy) {
      logger.warn(`[TokenRefreshService] No refresh strategy found for platform: ${account.platform}`);
      return null;
    }

    if (!strategy.canRefresh(account)) {
      logger.info(`[TokenRefreshService] Strategy indicates account ${account.id} (${account.platform}) cannot be refreshed`);
      return null;
    }

    try {
      const result = await strategy.refresh(account);
      
      const updated = await socialAccountRepository.updateTokens(account.id, {
        access_token: result.accessToken,
        refresh_token: result.refreshToken || account.refreshToken,
        expiry_date: result.expiresAt ? result.expiresAt.getTime() : null
      });

      logger.info(`[TokenRefreshService] ✅ Successfully refreshed token for platform: ${account.platform}, account ID: ${account.id}`);
      return updated;
    } catch (error) {
      logger.error(`[TokenRefreshService] ❌ Failed to refresh token for platform: ${account.platform}, account ID: ${account.id}. Error: ${error.message}`);
      
      // Đánh dấu tài khoản mất kết nối để người dùng chủ động cấu hình lại
      await prisma.socialAccount.update({
        where: { id: account.id },
        data: { isConnected: false }
      }).catch(dbErr => {
        logger.error(`[TokenRefreshService] Failed to mark account ${account.id} as disconnected:`, dbErr.message);
      });

      return null;
    }
  }

  /**
   * Hỗ trợ Proactive/Reactive Refresh: Lấy account ra, kiểm tra hết hạn, tự động refresh nếu cần rồi trả về account sạch.
   * @param {string} socialAccountId
   * @returns {Promise<Object>} Account sạch đã được refresh nếu cần
   */
  async getOrRefreshAccount(socialAccountId) {
    const account = await socialAccountRepository.findById(socialAccountId);
    if (!account) return null;

    const strategy = tokenRefreshRegistry.getStrategy(account.platform);
    if (!strategy || !account.tokenExpiresAt || account.accessToken.startsWith('mock-')) {
      return account;
    }

    const lookaheadDate = new Date(
      Date.now() + TOKEN_REFRESH_CONSTANTS.LOOKHEAD_DAYS * 24 * 60 * 60 * 1000
    );

    if (new Date(account.tokenExpiresAt) <= lookaheadDate) {
      logger.info(`[TokenRefreshService] Reactive trigger: Account ${account.id} (${account.platform}) token is expiring soon or expired. Refreshing now.`);
      const refreshed = await this.refreshAccount(account);
      if (refreshed) {
        return refreshed;
      }
    }

    return account;
  }
}

module.exports = new TokenRefreshService();
