const appConfig = require('../../config/app.config');
const logger = require('../../utils/logger');

/**
 * Lớp cơ sở trừu tượng (Abstract Base Class) định nghĩa giao diện chung cho các Social Platform Services.
 */
class BaseSocialService {
  async getChannelInfo(auth, startDate, endDate) {
    throw new Error("Method 'getChannelInfo()' must be implemented.");
  }

  async getPublishedVideos(brandId, pageToken, limit) {
    throw new Error("Method 'getPublishedVideos()' must be implemented.");
  }

  // Smart Fetch Sync hook — the only method allowed to call a platform's
  // live API for published posts (see PostsSyncSchedulerService). Default
  // no-op so platforms without a real posts-sync story (or MockSocialService
  // in sandbox mode) don't break the shared QStash webhook dispatch.
  async syncPublishedPosts(brandId, socialAccountId) {
    return { synced: 0 };
  }

  async getAnalyticsReport(auth, startDate, endDate) {
    throw new Error("Method 'getAnalyticsReport()' must be implemented.");
  }

  async connectChannel(brandId, code, redirectUri) {
    throw new Error("Method 'connectChannel()' must be implemented.");
  }

  /**
   * TEMPLATE METHOD: standardized connect-channel pipeline. Every platform's
   * connectChannel() used to do "exchange token → fetch identity → fetch
   * FULL historical analytics (up to 60s, real API calls) → persist" as one
   * long await chain — the OAuth callback response (and the user staring at
   * a blank redirect) blocked on the slowest step. This flips the order:
   * only identity (fast: token exchange + basic profile, no analytics) is
   * awaited before persisting the account and returning, so the redirect
   * fires almost immediately. Historical analytics + channel-snapshot
   * backfill run in the background afterward (fire-and-forget) and simply
   * update the already-connected account when done.
   *
   * Hook methods (implemented per platform):
   *  1. connectExchangeAuth(code, redirectUri, extra)   — token/auth exchange
   *  2. connectFetchIdentity(authResult, extra)          — basic profile/channel
   *     info only, NO analytics/insights call
   *  3. connectPersistAccount(brandId, identity, authResult, extra) — conflict
   *     check + upsert, called WITHOUT analytics data
   *  4. connectBackfillHistory(brandId, account, identity, authResult, extra)
   *     — OPTIONAL. Fetches historical analytics and re-upserts to backfill.
   *     Runs unawaited; the default no-op is fine for platforms (TikTok)
   *     that don't backfill anything at connect time.
   */
  async executeConnectPipeline(brandId, code, redirectUri, extra = {}) {
    const authResult = await this.connectExchangeAuth(code, redirectUri, extra);
    const identity = await this.connectFetchIdentity(authResult, extra);
    const account = await this.connectPersistAccount(brandId, identity, authResult, extra);

    Promise.resolve()
      .then(() => this.connectBackfillHistory(brandId, account, identity, authResult, extra))
      .catch((err) => {
        logger.error(`[${this.constructor.name}] Post-connect historical backfill failed for account ${account?.id} (connect still succeeded):`, err);
      });

    return account;
  }

  async connectExchangeAuth(code, redirectUri, extra = {}) {
    throw new Error("Hook method 'connectExchangeAuth()' must be implemented by subclass.");
  }

  async connectFetchIdentity(authResult, extra = {}) {
    throw new Error("Hook method 'connectFetchIdentity()' must be implemented by subclass.");
  }

  async connectPersistAccount(brandId, identity, authResult, extra = {}) {
    throw new Error("Hook method 'connectPersistAccount()' must be implemented by subclass.");
  }

  // Default no-op — platforms with no connect-time historical backfill
  // (TikTok) don't need to override this.
  async connectBackfillHistory(brandId, account, identity, authResult, extra = {}) {
    return null;
  }

  async syncChannelMetrics(socialAccountId, startDate, endDate) {
    throw new Error("Method 'syncChannelMetrics()' must be implemented.");
  }

  async trackVideo(brandId, videoUrl) {
    throw new Error("Method 'trackVideo()' must be implemented.");
  }

  async getVideoDetails(brandId, videoId) {
    throw new Error("Method 'getVideoDetails()' must be implemented.");
  }

  async searchChannel(brandId, query) {
    throw new Error("Method 'searchChannel()' must be implemented.");
  }

  async addCompetitor(brandId, channelId) {
    throw new Error("Method 'addCompetitor()' must be implemented.");
  }

  async fetchChannelComments(brandId) {
    throw new Error("Method 'fetchChannelComments()' must be implemented.");
  }

  async replyToComment(brandId, parentCommentId, text) {
    throw new Error("Method 'replyToComment()' must be implemented.");
  }

  async updatePublishedPost(brandId, platformPostId, postData) {
    throw new Error("Method 'updatePublishedPost()' must be implemented.");
  }

  async deletePost(brandId, platformPostId) {
    console.warn(`[BaseSocialService] deletePost() is not supported/implemented for this platform service.`);
    return { success: false, message: "Method 'deletePost()' is not implemented on this platform." };
  }

  /**
   * TEMPLATE METHOD: Bộ khung thuật toán đồng bộ chuẩn hoá cho tất cả các Social Platforms.
   * Định nghĩa quy trình 5 bước cố định:
   * 1. Validate Account & Auth
   * 2. Build Authenticated Platform Client (Hook method)
   * 3. Fetch Raw Data từ Platform API (Hook method)
   * 4. Normalize Raw Data về DTO chuẩn (Hook method)
   * 5. Lưu Database & kích hoạt Event / Socket (Cố định ở Lớp cha)
   */
  async executeSyncPipeline(brandId, socialAccountId, options = {}) {
    // Step 1: Validate Account & Auth
    const account = await this.getAccountAndValidate(brandId, socialAccountId);
    if (!account) {
      return { success: false, reason: 'ACCOUNT_NOT_FOUND_OR_DISCONNECTED', data: [] };
    }

    // Step 2: Build Authenticated Platform Client
    const client = await this.buildPlatformClient(account);

    // Step 3: Fetch Raw Data from Social Platform API
    const rawData = await this.fetchRawPlatformData(client, options);

    // Step 4: Normalize Raw Data to Standard DTO
    const normalizedItems = this.normalizePlatformData(rawData, options);

    // Step 5: Save/Update Database & Trigger Events
    const savedItems = await this.persistSyncedItems(brandId, socialAccountId, normalizedItems, options);

    return { success: true, count: savedItems.length, data: savedItems };
  }

  // --- Hook Methods (Các lớp con tự override) ---
  async getAccountAndValidate(brandId, socialAccountId) {
    if (typeof this._getAccount === 'function') {
      return await this._getAccount(brandId, socialAccountId);
    }
    return null;
  }

  async buildPlatformClient(account) {
    throw new Error("Hook method 'buildPlatformClient()' must be implemented by subclass.");
  }

  async fetchRawPlatformData(client, options = {}) {
    throw new Error("Hook method 'fetchRawPlatformData()' must be implemented by subclass.");
  }

  normalizePlatformData(rawData, options = {}) {
    throw new Error("Hook method 'normalizePlatformData()' must be implemented by subclass.");
  }

  async persistSyncedItems(brandId, socialAccountId, items, options = {}) {
    return items;
  }

  /**
   * Chuyển đổi đường dẫn cục bộ thành URL công khai dùng cho các nền tảng xã hội
   */
  resolveUrl(mediaUrl) {
    if (!mediaUrl) return null;
    if (mediaUrl.startsWith('http://') || mediaUrl.startsWith('https://')) {
      return mediaUrl;
    }
    const baseUrl = appConfig.backendBaseUrl;
    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const cleanMediaUrl = mediaUrl.startsWith('/') ? mediaUrl : `/${mediaUrl}`;
    return `${cleanBaseUrl}${cleanMediaUrl}`;
  }
}

module.exports = BaseSocialService;
