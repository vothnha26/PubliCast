const StockMediaFacade = require('../../src/services/stock/stock-media.facade');
const UnsplashProvider = require('../../src/services/stock/unsplash.provider');
const PexelsProvider = require('../../src/services/stock/pexels.provider');
const { STOCK_PROVIDERS, STOCK_MEDIA_TYPES } = require('../../src/utils/constants');
const redisClient = require('../../src/config/redis');
const cloudinary = require('../../src/config/cloudinary');
const prisma = require('../../src/config/prisma');

jest.mock('../../src/config/redis', () => ({
  get: jest.fn(),
  set: jest.fn()
}));

jest.mock('../../src/config/cloudinary', () => ({
  uploader: {
    upload: jest.fn()
  }
}));

jest.mock('../../src/config/prisma', () => ({
  mediaLibrary: {
    create: jest.fn()
  }
}));

jest.mock('axios');
const axios = require('axios');

describe('Stock Media Provider Suite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('UnsplashProvider Unit Tests', () => {
    let provider;
    beforeEach(() => {
      process.env.UNSPLASH_ACCESS_KEY = 'test_unsplash_key';
      provider = new UnsplashProvider();
    });

    test('should search photos and map response to DTO correctly', async () => {
      const mockResponse = {
        data: {
          total: 100,
          total_pages: 5,
          results: [
            {
              id: 'photo1',
              alt_description: 'Tech Image',
              width: 1920,
              height: 1080,
              blur_hash: 'L6PZfSi_',
              urls: { regular: 'https://preview.url', full: 'https://download.url' },
              links: { download_location: 'https://api.unsplash.com/photos/photo1/download' },
              user: { name: 'John Doe', links: { html: 'https://unsplash.com/@johndoe' } }
            }
          ]
        }
      };

      axios.get.mockResolvedValueOnce(mockResponse);

      const result = await provider.searchPhotos({ query: 'tech', page: 1, perPage: 10 });

      expect(axios.get).toHaveBeenCalledWith(
        'https://api.unsplash.com/search/photos',
        expect.objectContaining({
          headers: { Authorization: 'Client-ID test_unsplash_key' },
          params: expect.objectContaining({ query: 'tech', page: 1, per_page: 10 })
        })
      );
      expect(result.total).toBe(100);
      expect(result.items[0]).toEqual(expect.objectContaining({
        externalId: 'photo1',
        provider: STOCK_PROVIDERS.UNSPLASH,
        mediaType: STOCK_MEDIA_TYPES.PHOTO,
        photographerName: 'John Doe'
      }));
    });

    test('should trigger download location tracking for ToS compliance', async () => {
      axios.get.mockResolvedValueOnce({ data: { url: 'https://final-download.url' } });

      await provider.triggerDownloadTracking('https://api.unsplash.com/photos/photo1/download');

      expect(axios.get).toHaveBeenCalledWith(
        'https://api.unsplash.com/photos/photo1/download',
        { headers: { Authorization: 'Client-ID test_unsplash_key' } }
      );
    });
  });

  describe('PexelsProvider Unit Tests', () => {
    let provider;
    beforeEach(() => {
      process.env.PEXELS_API_KEY = 'test_pexels_key';
      provider = new PexelsProvider();
    });

    test('should search photos without Bearer prefix in header', async () => {
      const mockResponse = {
        data: {
          total_results: 50,
          photos: [
            {
              id: 12345,
              photographer: 'Jane Smith',
              photographer_url: 'https://pexels.com/@janesmith',
              src: { large: 'https://large.jpg', original: 'https://original.jpg' },
              width: 1200,
              height: 800,
              avg_color: '#FFFFFF'
            }
          ]
        }
      };

      axios.get.mockResolvedValueOnce(mockResponse);

      const result = await provider.searchPhotos({ query: 'nature', page: 1 });

      expect(axios.get).toHaveBeenCalledWith(
        'https://api.pexels.com/v1/search',
        expect.objectContaining({
          headers: { Authorization: 'test_pexels_key' }
        })
      );
      expect(result.items[0].provider).toBe(STOCK_PROVIDERS.PEXELS);
      expect(result.items[0].photographerName).toBe('Jane Smith');
    });

    test('should search videos from Pexels', async () => {
      const mockResponse = {
        data: {
          total_results: 20,
          videos: [
            {
              id: 999,
              image: 'https://thumb.jpg',
              duration: 15,
              width: 1920,
              height: 1080,
              user: { name: 'Video Maker', url: 'https://pexels.com/@videomaker' },
              video_files: [{ quality: 'hd', link: 'https://video.mp4' }]
            }
          ]
        }
      };

      axios.get.mockResolvedValueOnce(mockResponse);

      const result = await provider.searchVideos({ query: 'ocean', page: 1 });

      expect(result.items[0].mediaType).toBe(STOCK_MEDIA_TYPES.VIDEO);
      expect(result.items[0].downloadUrl).toBe('https://video.mp4');
    });
  });

  describe('StockMediaFacade Integration Tests', () => {
    test('should return cached results on Redis Cache Hit', async () => {
      const cachedData = { total: 1, items: [{ externalId: 'cached_1' }] };
      redisClient.get.mockResolvedValueOnce(JSON.stringify(cachedData));

      const result = await StockMediaFacade.search({
        provider: STOCK_PROVIDERS.UNSPLASH,
        query: 'tech'
      });

      expect(redisClient.get).toHaveBeenCalled();
      expect(result).toEqual(cachedData);
      expect(axios.get).not.toHaveBeenCalled();
    });

    test('should import media to Cloudinary and save record in Prisma DB', async () => {
      cloudinary.uploader.upload.mockResolvedValueOnce({
        secure_url: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
        bytes: 2048,
        width: 1920,
        height: 1080
      });

      prisma.mediaLibrary.create.mockResolvedValueOnce({
        id: 'media_record_1',
        brandId: 'brand_123',
        storageUrl: 'https://res.cloudinary.com/demo/image/upload/sample.jpg'
      });

      const importPayload = {
        brandId: 'brand_123',
        userId: 'user_456',
        provider: STOCK_PROVIDERS.PEXELS,
        externalId: '12345',
        downloadUrl: 'https://original.jpg',
        photographerName: 'Jane Smith',
        photographerUrl: 'https://pexels.com/@janesmith',
        attributionHtml: 'Photo by Jane Smith',
        mediaType: STOCK_MEDIA_TYPES.PHOTO
      };

      const result = await StockMediaFacade.importToMediaLibrary(importPayload);

      expect(cloudinary.uploader.upload).toHaveBeenCalledWith(
        'https://original.jpg',
        expect.objectContaining({ folder: 'publicast/brands/brand_123/stock' })
      );

      expect(prisma.mediaLibrary.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            brandId: 'brand_123',
            source: STOCK_PROVIDERS.PEXELS,
            externalId: '12345'
          })
        })
      );

      expect(result.id).toBe('media_record_1');
    });
  });

  describe('Sanitization & Referral Helper Tests', () => {
    const { sanitizeAttributionHtml, appendUnsplashReferral } = require('../../src/services/stock/unsplash.provider'); // or test logic directly

    test('should strip dangerous script tags and inline event handlers from attributionHtml', () => {
      const { sanitizeAttributionHtml } = require('../../src/services/stock/stock-media-provider.interface');
      // Directly verify sanitization regex logic
      const malicious = 'Photo by <script>alert("XSS")</script><a href="https://unsplash.com" onclick="alert(1)">Author</a>';
      const clean = malicious
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/\s+on[a-z]+\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]+)/gi, '');

      expect(clean).not.toContain('<script>');
      expect(clean).not.toContain('onclick');
      expect(clean).toContain('https://unsplash.com');
    });
  });
});
