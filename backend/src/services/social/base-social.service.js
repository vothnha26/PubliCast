const appConfig = require('../../config/app.config');

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
