/**
 * Strategy Interface cho Stock Media Provider (Unsplash, Pexels, etc.)
 * Tuân thủ nguyên tắc SOLID (Interface Segregation & Dependency Inversion).
 */
class IStockMediaProvider {
  async searchPhotos({ query, page, perPage, orientation }) {
    throw new Error('Method searchPhotos() must be implemented');
  }

  async searchVideos({ query, page, perPage, orientation }) {
    throw new Error('Method searchVideos() must be implemented');
  }

  async triggerDownloadTracking(downloadLocationUrl) {
    // Cho phép override ở các provider có yêu cầu ToS theo dõi lượt download (vd: Unsplash)
  }
}

module.exports = IStockMediaProvider;
