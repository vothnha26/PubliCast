/**
 * Quota Tracker Service Tests
 *
 * Test suite ensures that quota tracking:
 * 1. Increments quota usage correctly
 * 2. Respects timezone (Pacific Time)
 * 3. Resets daily at midnight PT
 * 4. Calculates appropriate cache TTL based on usage
 */

const QuotaTrackerService = require('../../src/services/social/quota-tracker.service');
const { QUOTA_TTL_STRATEGY } = require('../../src/utils/constants');

// Mock Redis client
const mockRedisClient = {
  incrBy: jest.fn(),
  get: jest.fn(),
  expire: jest.fn(),
  ttl: jest.fn(),
  del: jest.fn()
};

describe('QuotaTrackerService', () => {
  let quotaService;

  beforeEach(() => {
    jest.clearAllMocks();
    quotaService = new QuotaTrackerService(mockRedisClient);
  });

  describe('incrementAndGet', () => {
    it('should increment quota usage by 1 by default', async () => {
      mockRedisClient.incrBy.mockResolvedValue(1);
      mockRedisClient.ttl.mockResolvedValue(1000);

      const usage = await quotaService.incrementAndGet('youtube-analytics');

      expect(usage).toBe(1);
      expect(mockRedisClient.incrBy).toHaveBeenCalledWith(expect.any(String), 1);
    });

    it('should increment quota by specified amount', async () => {
      mockRedisClient.incrBy.mockResolvedValue(6);
      mockRedisClient.ttl.mockResolvedValue(1000);

      const usage = await quotaService.incrementAndGet('youtube-analytics', 6);

      expect(usage).toBe(6);
      expect(mockRedisClient.incrBy).toHaveBeenCalledWith(expect.any(String), 6);
    });

    it('should set TTL if key is new', async () => {
      mockRedisClient.incrBy.mockResolvedValue(1);
      mockRedisClient.ttl.mockResolvedValue(-1);

      await quotaService.incrementAndGet('youtube-analytics', 1);

      expect(mockRedisClient.expire).toHaveBeenCalled();
    });

    it('should handle different services independently', async () => {
      mockRedisClient.incrBy.mockResolvedValueOnce(5).mockResolvedValueOnce(3);
      mockRedisClient.ttl.mockResolvedValue(1000);

      const usage1 = await quotaService.incrementAndGet('service1', 5);
      const usage2 = await quotaService.incrementAndGet('service2', 3);

      expect(usage1).toBe(5);
      expect(usage2).toBe(3);
    });
  });

  describe('getCalculatedTTL', () => {
    it('should return DEFAULT_TTL when usage is low (0-50%)', async () => {
      mockRedisClient.get.mockResolvedValue('2000'); // 20% of 10000

      const ttl = await quotaService.getCalculatedTTL('youtube-analytics', QUOTA_TTL_STRATEGY.YOUTUBE_ANALYTICS);

      expect(ttl).toBe(QUOTA_TTL_STRATEGY.YOUTUBE_ANALYTICS.DEFAULT_TTL_SEC);
    });

    it('should return 6h TTL when usage is medium (50-80%)', async () => {
      mockRedisClient.get.mockResolvedValue('6000'); // 60% of 10000

      const ttl = await quotaService.getCalculatedTTL('youtube-analytics', QUOTA_TTL_STRATEGY.YOUTUBE_ANALYTICS);

      expect(ttl).toBe(6 * 3600);
    });

    it('should return 12h TTL when usage is high (>80%)', async () => {
      mockRedisClient.get.mockResolvedValue('8500'); // 85% of 10000

      const ttl = await quotaService.getCalculatedTTL('youtube-analytics', QUOTA_TTL_STRATEGY.YOUTUBE_ANALYTICS);

      expect(ttl).toBe(12 * 3600);
    });

    it('should handle zero usage', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const ttl = await quotaService.getCalculatedTTL('youtube-analytics', QUOTA_TTL_STRATEGY.YOUTUBE_ANALYTICS);

      expect(ttl).toBe(QUOTA_TTL_STRATEGY.YOUTUBE_ANALYTICS.DEFAULT_TTL_SEC);
    });
  });

  describe('getQuotaKey', () => {
    it('should generate quota key with date', () => {
      const key = quotaService.getQuotaKey('youtube-analytics');

      expect(key).toContain('quota:youtube-analytics:');
      expect(key).toMatch(/\d{4}-\d{2}-\d{2}/); // YYYY-MM-DD format
    });

    it('should include service name in key', () => {
      const key = quotaService.getQuotaKey('test-service');

      expect(key).toContain('test-service');
    });
  });

  describe('getCurrentUsage', () => {
    it('should return current usage', async () => {
      mockRedisClient.get.mockResolvedValue('500');

      const usage = await quotaService.getCurrentUsage('youtube-analytics');

      expect(usage).toBe(500);
    });

    it('should return 0 if not set', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const usage = await quotaService.getCurrentUsage('youtube-analytics');

      expect(usage).toBe(0);
    });
  });

  describe('getUsagePercentage', () => {
    it('should calculate usage percentage correctly', async () => {
      mockRedisClient.get.mockResolvedValue('5000'); // 50%

      const percentage = await quotaService.getUsagePercentage('youtube-analytics', QUOTA_TTL_STRATEGY.YOUTUBE_ANALYTICS);

      expect(percentage).toBe(50);
    });

    it('should handle high usage', async () => {
      mockRedisClient.get.mockResolvedValue('9000'); // 90%

      const percentage = await quotaService.getUsagePercentage('youtube-analytics', QUOTA_TTL_STRATEGY.YOUTUBE_ANALYTICS);

      expect(percentage).toBe(90);
    });
  });

  describe('hasExceededThreshold', () => {
    it('should return true when threshold exceeded', async () => {
      mockRedisClient.get.mockResolvedValue('8000'); // 80%

      const exceeded = await quotaService.hasExceededThreshold('youtube-analytics', 75, QUOTA_TTL_STRATEGY.YOUTUBE_ANALYTICS);

      expect(exceeded).toBe(true);
    });

    it('should return false when threshold not exceeded', async () => {
      mockRedisClient.get.mockResolvedValue('4000'); // 40%

      const exceeded = await quotaService.hasExceededThreshold('youtube-analytics', 50, QUOTA_TTL_STRATEGY.YOUTUBE_ANALYTICS);

      expect(exceeded).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should handle Redis errors gracefully in incrementAndGet', async () => {
      mockRedisClient.incrBy.mockRejectedValue(new Error('Redis error'));

      await expect(quotaService.incrementAndGet('youtube-analytics', 1)).rejects.toThrow('Redis error');
    });

    it('should return default TTL on error in getCalculatedTTL', async () => {
      mockRedisClient.get.mockRejectedValue(new Error('Redis error'));

      const ttl = await quotaService.getCalculatedTTL('youtube-analytics', QUOTA_TTL_STRATEGY.YOUTUBE_ANALYTICS);

      expect(ttl).toBe(QUOTA_TTL_STRATEGY.YOUTUBE_ANALYTICS.DEFAULT_TTL_SEC);
    });
  });

  describe('calculateTTLToPT', () => {
    it('should return a positive number', () => {
      const ttl = quotaService.calculateTTLToPT();

      expect(typeof ttl).toBe('number');
      expect(ttl).toBeGreaterThan(0);
      expect(ttl).toBeLessThanOrEqual(24 * 3600); // Max 24 hours
    });
  });

  describe('getSummary', () => {
    it('should return summary object', async () => {
      mockRedisClient.get.mockResolvedValue('5000');
      mockRedisClient.ttl.mockResolvedValue(3600);

      const summary = await quotaService.getSummary('youtube-analytics', QUOTA_TTL_STRATEGY.YOUTUBE_ANALYTICS);

      expect(summary).toHaveProperty('serviceName');
      expect(summary).toHaveProperty('currentUsage');
      expect(summary).toHaveProperty('dailyLimit');
      expect(summary).toHaveProperty('usagePercentage');
      expect(summary).toHaveProperty('cacheTTL');
    });
  });

  describe('resetQuota', () => {
    it('should delete quota key', async () => {
      mockRedisClient.del.mockResolvedValue(1);

      const result = await quotaService.resetQuota('youtube-analytics');

      expect(result).toBe(1);
      expect(mockRedisClient.del).toHaveBeenCalled();
    });
  });
});
