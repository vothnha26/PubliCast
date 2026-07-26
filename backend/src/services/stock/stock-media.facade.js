const UnsplashProvider = require('./unsplash.provider');
const PexelsProvider = require('./pexels.provider');
const { STOCK_PROVIDERS, STOCK_MEDIA_TYPES } = require('../../utils/constants');
const redisClient = require('../../config/redis');
const cloudinary = require('../../config/cloudinary');
const prisma = require('../../config/prisma');

class StockMediaFactory {
  constructor() {
    this.providers = {
      [STOCK_PROVIDERS.UNSPLASH]: new UnsplashProvider(),
      [STOCK_PROVIDERS.PEXELS]: new PexelsProvider()
    };
  }

  getProvider(providerName) {
    const providerKey = providerName?.toUpperCase();
    const provider = this.providers[providerKey];
    if (!provider) {
      throw new Error(`Stock provider '${providerName}' is not supported`);
    }
    return provider;
  }
}

class StockMediaFacade {
  constructor() {
    this.factory = new StockMediaFactory();
  }

  async search({ provider = STOCK_PROVIDERS.UNSPLASH, query, page = 1, perPage = 20, mediaType = STOCK_MEDIA_TYPES.PHOTO, orientation }) {
    if (!query) {
      return { total: 0, page: Number(page), items: [] };
    }

    const cacheKey = `stock:search:${provider}:${mediaType}:${query.toLowerCase().trim()}:${page}:${orientation || 'all'}`;
    
    // Check Redis Cache
    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (err) {
      console.warn('[StockMediaFacade] Redis cache get failed, falling back to live API call:', err.message);
    }

    const providerImpl = this.factory.getProvider(provider);
    const result = mediaType === STOCK_MEDIA_TYPES.VIDEO
      ? await providerImpl.searchVideos({ query, page, perPage, orientation })
      : await providerImpl.searchPhotos({ query, page, perPage, orientation });

    // Save to Redis Cache (TTL = 1 hour / 3600s)
    try {
      await redisClient.set(cacheKey, JSON.stringify(result), { EX: 3600 });
    } catch (err) {
      console.warn('[StockMediaFacade] Redis cache set failed:', err.message);
    }

    return result;
  }

  async importToMediaLibrary({ brandId, userId, provider, externalId, downloadUrl, downloadLocationUrl, photographerName, photographerUrl, attributionHtml, mediaType = STOCK_MEDIA_TYPES.PHOTO }) {
    const providerImpl = this.factory.getProvider(provider);

    // Unsplash ToS Mandatory Download Tracking
    if (provider === STOCK_PROVIDERS.UNSPLASH && downloadLocationUrl) {
      await providerImpl.triggerDownloadTracking(downloadLocationUrl);
    }

    // Upload image/video from Stock Download URL to Cloudinary
    let uploadRes;
    try {
      uploadRes = await cloudinary.uploader.upload(downloadUrl, {
        folder: `publicast/brands/${brandId}/stock`,
        resource_type: mediaType === STOCK_MEDIA_TYPES.VIDEO ? 'video' : 'image'
      });
    } catch (err) {
      throw new Error(`Cloudinary upload failed for stock media: ${err.message}`);
    }

    // Save Media item to DB (model MediaLibrary)
    const mediaRecord = await prisma.mediaLibrary.create({
      data: {
        brandId,
        mediaId: `stock_${provider.toLowerCase()}_${externalId}`,
        filename: `${provider}_${externalId}`,
        mimeType: mediaType === STOCK_MEDIA_TYPES.VIDEO ? 'video/mp4' : 'image/jpeg',
        sizeBytes: uploadRes.bytes || 0,
        width: uploadRes.width || null,
        height: uploadRes.height || null,
        durationSeconds: uploadRes.duration || null,
        storageUrl: uploadRes.secure_url,
        thumbnailUrl: uploadRes.secure_url,
        source: provider,
        externalId,
        photographerName,
        photographerUrl,
        attributionHtml,
        uploadedByUserId: userId,
        uploadedAt: new Date()
      }
    });

    return mediaRecord;
  }
}

module.exports = new StockMediaFacade();
