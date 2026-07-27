const axios = require('axios');
const IStockMediaProvider = require('./stock-media-provider.interface');
const { STOCK_PROVIDERS, STOCK_MEDIA_TYPES } = require('../../utils/constants');

class PexelsProvider extends IStockMediaProvider {
  constructor() {
    super();
    this.apiKey = process.env.PEXELS_API_KEY;
    this.baseUrl = 'https://api.pexels.com';
  }

  async searchPhotos({ query, page = 1, perPage = 20, orientation }) {
    if (!this.apiKey) {
      throw new Error('PEXELS_API_KEY is not configured in environment');
    }

    const response = await axios.get(`${this.baseUrl}/v1/search`, {
      headers: { Authorization: this.apiKey }, // Notice: No "Bearer" prefix
      params: { 
        query, 
        page, 
        per_page: perPage, 
        orientation: orientation || undefined 
      }
    });

    return {
      total: response.data.total_results,
      page: Number(page),
      items: response.data.photos.map(photo => this._mapPhotoToDTO(photo))
    };
  }

  async searchVideos({ query, page = 1, perPage = 20, orientation }) {
    if (!this.apiKey) {
      throw new Error('PEXELS_API_KEY is not configured in environment');
    }

    const response = await axios.get(`${this.baseUrl}/videos/search`, {
      headers: { Authorization: this.apiKey },
      params: { 
        query, 
        page, 
        per_page: perPage, 
        orientation: orientation || undefined 
      }
    });

    return {
      total: response.data.total_results,
      page: Number(page),
      items: response.data.videos.map(video => this._mapVideoToDTO(video))
    };
  }

  _mapPhotoToDTO(photo) {
    return {
      externalId: String(photo.id),
      provider: STOCK_PROVIDERS.PEXELS,
      mediaType: STOCK_MEDIA_TYPES.PHOTO,
      title: `Photo by ${photo.photographer}`,
      previewUrl: photo.src.large,
      downloadUrl: photo.src.original,
      width: photo.width,
      height: photo.height,
      avgColor: photo.avg_color,
      photographerName: photo.photographer,
      photographerUrl: photo.photographer_url,
      attributionHtml: `Photo by <a href="${photo.photographer_url}" target="_blank" rel="noopener">${photo.photographer}</a> on <a href="https://www.pexels.com" target="_blank" rel="noopener">Pexels</a>`
    };
  }

  _mapVideoToDTO(video) {
    const hdFile = video.video_files.find(f => f.quality === 'hd') || video.video_files[0];
    return {
      externalId: String(video.id),
      provider: STOCK_PROVIDERS.PEXELS,
      mediaType: STOCK_MEDIA_TYPES.VIDEO,
      title: `Video by ${video.user.name}`,
      previewUrl: video.image,
      downloadUrl: hdFile ? hdFile.link : '',
      duration: video.duration,
      width: video.width,
      height: video.height,
      photographerName: video.user.name,
      photographerUrl: video.user.url,
      attributionHtml: `Video by <a href="${video.user.url}" target="_blank" rel="noopener">${video.user.name}</a> on <a href="https://www.pexels.com" target="_blank" rel="noopener">Pexels</a>`
    };
  }
}

module.exports = PexelsProvider;
