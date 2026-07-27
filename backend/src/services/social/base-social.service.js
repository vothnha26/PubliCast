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
   * Chuyển đổi đường dẫn cục bộ thành URL công khai dùng cho các nền tảng xã hội
   */
  resolveUrl(mediaUrl) {
    if (!mediaUrl) return null;
    if (mediaUrl.startsWith('http://') || mediaUrl.startsWith('https://')) {
      return mediaUrl;
    }
    const baseUrl = process.env.BACKEND_BASE_URL || 'http://localhost:3000';
    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const cleanMediaUrl = mediaUrl.startsWith('/') ? mediaUrl : `/${mediaUrl}`;
    return `${cleanBaseUrl}${cleanMediaUrl}`;
  }
}

module.exports = BaseSocialService;
