const axios = require('axios');
const IStockMediaProvider = require('./stock-media-provider.interface');
const { STOCK_PROVIDERS, STOCK_MEDIA_TYPES } = require('../../utils/constants');

class UnsplashProvider extends IStockMediaProvider {
  constructor() {
    super();
    this.accessKey = process.env.UNSPLASH_ACCESS_KEY;
    this.baseUrl = 'https://api.unsplash.com';
    this.appName = process.env.APP_NAME || 'PubliCast';
  }

  async searchPhotos({ query, page = 1, perPage = 20, orientation }) {
    if (!this.accessKey) {
      throw new Error('UNSPLASH_ACCESS_KEY is not configured in environment');
    }

    const response = await axios.get(`${this.baseUrl}/search/photos`, {
      headers: { Authorization: `Client-ID ${this.accessKey}` },
      params: { 
        query, 
        page, 
        per_page: perPage, 
        orientation: orientation || undefined, 
        content_filter: 'high' 
      }
    });

    return {
      total: response.data.total,
      totalPages: response.data.total_pages,
      page: Number(page),
      items: response.data.results.map(photo => this._mapPhotoToDTO(photo))
    };
  }

  async searchVideos() {
    // Unsplash chỉ hỗ trợ photo
    return { total: 0, totalPages: 0, page: 1, items: [] };
  }

  async triggerDownloadTracking(downloadLocationUrl) {
    if (!downloadLocationUrl) return;
    try {
      await axios.get(downloadLocationUrl, {
        headers: { Authorization: `Client-ID ${this.accessKey}` }
      });
    } catch (error) {
      console.error('[Unsplash ToS] Trigger download tracking failed:', error.message);
    }
  }

  _mapPhotoToDTO(photo) {
    const photographerUrl = `${photo.user.links.html}?utm_source=${this.appName}&utm_medium=referral`;
    const unsplashUrl = `https://unsplash.com/?utm_source=${this.appName}&utm_medium=referral`;

    return {
      externalId: photo.id,
      provider: STOCK_PROVIDERS.UNSPLASH,
      mediaType: STOCK_MEDIA_TYPES.PHOTO,
      title: photo.alt_description || photo.description || 'Unsplash Photo',
      previewUrl: photo.urls.regular,
      downloadUrl: photo.urls.full,
      downloadLocationUrl: photo.links.download_location,
      width: photo.width,
      height: photo.height,
      blurHash: photo.blur_hash,
      photographerName: photo.user.name,
      photographerUrl,
      attributionHtml: `Photo by <a href="${photographerUrl}" target="_blank" rel="noopener">${photo.user.name}</a> on <a href="${unsplashUrl}" target="_blank" rel="noopener">Unsplash</a>`
    };
  }
}

module.exports = UnsplashProvider;
