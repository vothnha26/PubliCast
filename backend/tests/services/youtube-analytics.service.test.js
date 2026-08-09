/**
 * YouTube Analytics Enhanced Service Tests
 *
 * Integration tests for the cache + lock + quota pattern:
 * 1. Thundering Herd prevention with distributed locks
 * 2. Cache fallback chain (main → stale → status message)
 * 3. Quota tracking integration
 * 4. Timeout and retry behavior
 */

// Mock dependencies BEFORE requiring the module
jest.mock('../../src/services/social/distributed-lock.service', () => {
  return jest.fn().mockImplementation(() => ({
    acquireLock: jest.fn(),
    releaseLock: jest.fn()
  }));
});

jest.mock('../../src/services/social/quota-tracker.singleton', () => ({
  incrementAndGet: jest.fn().mockResolvedValue(6),
  getCalculatedTTL: jest.fn().mockResolvedValue(7200)
}));

jest.mock('../../src/services/social/redis-health.service', () => {
  return jest.fn().mockImplementation(() => ({
    shouldFailOpen: jest.fn().mockResolvedValue(false)
  }));
});

jest.mock('../../src/services/social/youtube/youtube.gateway');
jest.mock('../../src/repositories/social/social-account.repository');

const YouTubeAnalyticsEnhancedService = require('../../src/services/social/youtube/youtube-analytics-enhanced.service');
const mockQuotaService = require('../../src/services/social/quota-tracker.singleton');

describe('YouTubeAnalyticsEnhancedService', () => {
  let service;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create service instance with mocked dependencies
    service = new YouTubeAnalyticsEnhancedService();
  });

  describe('getPostInsights', () => {
    it('should return cached data without fetching', async () => {
      const cachedData = { videoId: 'test123', views: 1000 };
      service._readCache = jest.fn().mockResolvedValue(cachedData);

      const result = await service.getPostInsights('brand1', 'test123');

      expect(result).toEqual(cachedData);
      expect(service._readCache).toHaveBeenCalledWith('yt:video-insights:test123');
    });

    it('should acquire lock and start background fetch', async () => {
      service._readCache = jest.fn().mockResolvedValue(null);
      service.lockService.acquireLock.mockResolvedValue('token-123');
      service._handleLockAcquired = jest.fn().mockResolvedValue({ status: 'FETCHING_IN_PROGRESS' });
      service.redisHealthService.shouldFailOpen.mockResolvedValue(false);

      await service.getPostInsights('brand1', 'video123');

      expect(service.lockService.acquireLock).toHaveBeenCalled();
      expect(service._handleLockAcquired).toHaveBeenCalled();
    });

    it('should handle lock not acquired (polling)', async () => {
      service._readCache = jest.fn().mockResolvedValue(null);
      service.lockService.acquireLock.mockResolvedValue(null);
      service._handleLockNotAcquired = jest.fn().mockResolvedValue({ status: 'FETCHING_IN_PROGRESS' });
      service.redisHealthService.shouldFailOpen.mockResolvedValue(false);

      await service.getPostInsights('brand1', 'video123');

      expect(service._handleLockNotAcquired).toHaveBeenCalled();
    });

    it('should fail-open when Redis is down', async () => {
      service._readCache = jest.fn().mockResolvedValue(null);
      service.redisHealthService.shouldFailOpen.mockResolvedValue(true);
      service._fetchInsightsDirectly = jest.fn().mockResolvedValue({ videoId: 'test' });

      await service.getPostInsights('brand1', 'video123');

      expect(service._fetchInsightsDirectly).toHaveBeenCalled();
    });
  });

  describe('_handleLockAcquired', () => {
    it('should start background fetch and wait for cache', async () => {
      service._backgroundFetch = jest.fn().mockResolvedValue(undefined);
      service._waitForCacheOrFallback = jest.fn().mockResolvedValue({ videoId: 'test' });

      const result = await service._handleLockAcquired('brand1', 'video123', 'token', 'cache', 'stale', 'lock');

      expect(service._backgroundFetch).toHaveBeenCalled();
      expect(service._waitForCacheOrFallback).toHaveBeenCalled();
      expect(result).toEqual({ videoId: 'test' });
    });
  });

  describe('_handleLockNotAcquired', () => {
    it('should poll for cache', async () => {
      service._waitForCacheOrFallback = jest.fn().mockResolvedValue({ videoId: 'test' });

      const result = await service._handleLockNotAcquired('video123', 'cache', 'stale');

      expect(service._waitForCacheOrFallback).toHaveBeenCalled();
    });
  });

  describe('_waitForCacheOrFallback', () => {
    it('should return cache if found during polling', async () => {
      const cachedData = { videoId: 'test', views: 500 };
      service._readCache = jest.fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(cachedData);

      const result = await service._waitForCacheOrFallback('video123', 'cache', 'stale');

      expect(result).toEqual(cachedData);
      expect(service._readCache).toHaveBeenCalledTimes(3);
    });

    it('should return stale cache on polling timeout', async () => {
      const staleData = { videoId: 'test', isStale: true };
      service._readCache = jest.fn().mockResolvedValue(null);
      service._readCache.mockResolvedValueOnce(null); // No cache during polling
      service._readCache = jest.fn()
        .mockResolvedValueOnce(null) // Cache miss during polling
        .mockResolvedValueOnce(staleData); // But stale data available

      const result = await service._waitForCacheOrFallback('video123', 'cache', 'stale');

      expect(result).toEqual(staleData);
    });

    it('should return status message if no cache available', async () => {
      service._readCache = jest.fn().mockResolvedValue(null);

      const result = await service._waitForCacheOrFallback('video123', 'cache', 'stale');

      expect(result.status).toBe('FETCHING_IN_PROGRESS');
    }, 10000);
  });

  describe('_backgroundFetch', () => {
    it('should increment quota and cache results', async () => {
      const mockAuth = { credentials: { access_token: 'token' } };
      service._getAuthClient = jest.fn().mockResolvedValue(mockAuth);
      service._buildInsights = jest.fn().mockResolvedValue({ videoId: 'test', views: 100 });
      service._writeCache = jest.fn().mockResolvedValue(undefined);

      await service._backgroundFetch('brand1', 'video123', 'token', 'cache', 'stale', 'lock');

      expect(mockQuotaService.incrementAndGet).toHaveBeenCalledWith('youtube-analytics', 1);
      expect(service._buildInsights).toHaveBeenCalledWith(mockAuth, 'video123');
      expect(service._writeCache).toHaveBeenCalledTimes(2); // Cache + stale
      expect(service.lockService.releaseLock).toHaveBeenCalledWith('lock', 'token');
    });

    it('should release lock even on error', async () => {
      service._getAuthClient = jest.fn().mockResolvedValue(null);

      await service._backgroundFetch('brand1', 'video123', 'token', 'cache', 'stale', 'lock');

      expect(service.lockService.releaseLock).toHaveBeenCalledWith('lock', 'token');
    });
  });

  describe('_fetchInsightsDirectly', () => {
    it('should fetch insights without lock when Redis down', async () => {
      const mockAuth = { credentials: { access_token: 'token' } };
      service._getAuthClient = jest.fn().mockResolvedValue(mockAuth);
      service._buildInsights = jest.fn().mockResolvedValue({ videoId: 'test' });

      const result = await service._fetchInsightsDirectly('brand1', 'video123');

      expect(service._buildInsights).toHaveBeenCalledWith(mockAuth, 'video123');
      expect(mockQuotaService.incrementAndGet).toHaveBeenCalledWith('youtube-analytics', 1);
    });

    it('should return status message if fetch fails', async () => {
      service._getAuthClient = jest.fn().mockResolvedValue(null);

      const result = await service._fetchInsightsDirectly('brand1', 'video123');

      expect(result.status).toBe('FETCHING_IN_PROGRESS');
    });
  });

  describe('_getStatusMessage', () => {
    it('should return status message with FETCHING_IN_PROGRESS', () => {
      const message = service._getStatusMessage();

      expect(message.status).toBe('FETCHING_IN_PROGRESS');
      expect(message.message).toBeDefined();
      expect(message.timestamp).toBeDefined();
    });
  });

  describe('_timeoutPromise', () => {
    it('should reject after specified timeout', async () => {
      const promise = service._timeoutPromise(100);

      await expect(promise).rejects.toThrow('API timeout after 100ms');
    });
  });

  describe('Concurrent requests', () => {
    it('should prevent Thundering Herd with multiple concurrent requests', async () => {
      service._readCache = jest.fn().mockResolvedValue(null);
      service.lockService.acquireLock = jest.fn()
        .mockResolvedValueOnce('token-1')
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      service._handleLockAcquired = jest.fn().mockResolvedValue({ videoId: 'test' });
      service._handleLockNotAcquired = jest.fn().mockResolvedValue({ videoId: 'test' });
      service.redisHealthService.shouldFailOpen.mockResolvedValue(false);

      // Simulate 3 concurrent requests
      const req1 = service.getPostInsights('brand1', 'video123');
      const req2 = service.getPostInsights('brand1', 'video123');
      const req3 = service.getPostInsights('brand1', 'video123');

      await Promise.all([req1, req2, req3]);

      // Only 1 should acquire lock
      expect(service.lockService.acquireLock).toHaveBeenCalledTimes(3);
      // 1 lock acquired, 2 polls
      expect(service._handleLockAcquired).toHaveBeenCalledTimes(1);
      expect(service._handleLockNotAcquired).toHaveBeenCalledTimes(2);
    });
  });

  describe('Quota tracking', () => {
    it('should track quota usage and calculate TTL', async () => {
      const mockAuth = { credentials: { access_token: 'token' } };
      service._getAuthClient = jest.fn().mockResolvedValue(mockAuth);
      service._buildInsights = jest.fn().mockResolvedValue({ videoId: 'test' });
      service._readCache = jest.fn().mockResolvedValue(null);
      service.lockService.acquireLock.mockResolvedValue('token');
      service._waitForCacheOrFallback = jest.fn().mockResolvedValue({ videoId: 'test' });
      service.redisHealthService.shouldFailOpen.mockResolvedValue(false);

      await service.getPostInsights('brand1', 'video123');

      // Check quota was incremented
      expect(mockQuotaService.incrementAndGet).toHaveBeenCalledWith('youtube-analytics', 1);
      // Check TTL was calculated
      expect(mockQuotaService.getCalculatedTTL).toHaveBeenCalled();
    });
  });
});
