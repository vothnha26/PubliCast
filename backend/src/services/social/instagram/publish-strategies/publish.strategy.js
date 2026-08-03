const logger = require('../../../../utils/logger');
class InstagramPublishStrategy {
  async publish(igAccountId, accessToken, postData) {
    throw new Error("Method 'publish()' must be implemented.");
  }

  /**
   * Chuyển đổi đường dẫn cục bộ thành URL công khai dùng để đăng lên Meta
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

  /**
   * Helper method to poll for container status until it is ready (FINISHED)
   */
  async pollUntilReady(instagramGateway, containerId, accessToken, maxAttempts = 60, intervalMs = 5000) {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const statusData = await instagramGateway.pollContainerStatus(containerId, accessToken);
      const code = statusData.status_code;
      logger.debug(`[Instagram Polling] Attempt ${attempt}/${maxAttempts} | Container: ${containerId} | Status: ${code}`);
      if (code === 'FINISHED') {
        return;
      }
      if (code === 'ERROR') {
        throw new Error(statusData.status || 'Instagram video container processing failed');
      }
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
    throw new Error('Timeout waiting for Instagram media container to be ready');
  }
}

module.exports = InstagramPublishStrategy;
