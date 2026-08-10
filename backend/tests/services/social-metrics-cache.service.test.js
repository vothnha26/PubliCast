/**
 * Social Metrics Cache Service Tests
 *
 * Cache-Aside for SocialService.getAggregatedMetrics (Channel Insights'
 * data source):
 * 1. get() returns null on miss / parses JSON on hit
 * 2. set() writes with REDIS_TTL.SOCIAL_METRICS_SEC under one key per brand
 * 3. invalidateBrand() deletes that key
 * 4. Redis errors are swallowed — cache is best-effort, never blocks the read path
 */

const SocialMetricsCacheService = require('../../src/services/social/social-metrics-cache.service');
const { REDIS_NAMESPACES, REDIS_TTL } = require('../../src/utils/constants');

const mockRedisClient = {
  get: jest.fn(),
  setEx: jest.fn(),
  del: jest.fn()
};

describe('SocialMetricsCacheService', () => {
  let cache;

  beforeEach(() => {
    jest.clearAllMocks();
    cache = new SocialMetricsCacheService(mockRedisClient);
  });

  describe('get', () => {
    it('returns null on cache miss', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const result = await cache.get('brand-1');

      expect(result).toBeNull();
      expect(mockRedisClient.get).toHaveBeenCalledWith(`${REDIS_NAMESPACES.SOCIAL_METRICS}:brand-1`);
    });

    it('parses and returns the cached payload on hit', async () => {
      const accounts = [{ id: 'sa-1', platform: 'FACEBOOK' }];
      mockRedisClient.get.mockResolvedValue(JSON.stringify(accounts));

      const result = await cache.get('brand-1');

      expect(result).toEqual(accounts);
    });

    it('returns null (not throw) when Redis errors', async () => {
      mockRedisClient.get.mockRejectedValue(new Error('connection reset'));

      const result = await cache.get('brand-1');

      expect(result).toBeNull();
    });
  });

  describe('set', () => {
    it('writes the stripped accounts array with REDIS_TTL.SOCIAL_METRICS_SEC', async () => {
      const accounts = [{ id: 'sa-1', platform: 'FACEBOOK' }];

      await cache.set('brand-1', accounts);

      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        `${REDIS_NAMESPACES.SOCIAL_METRICS}:brand-1`,
        REDIS_TTL.SOCIAL_METRICS_SEC,
        JSON.stringify(accounts)
      );
    });

    it('never receives token fields in what it serializes (caller contract)', async () => {
      // This is the contract social.service.js must uphold — set() itself
      // has no way to strip, it just proves whatever is passed in is what
      // gets written verbatim (so a regression at the call site is visible
      // in social.service.js's own test, not silently absorbed here).
      const stripped = [{ id: 'sa-1', platform: 'FACEBOOK', displayName: 'Page' }];

      await cache.set('brand-1', stripped);

      const [, , serialized] = mockRedisClient.setEx.mock.calls[0];
      expect(serialized).not.toContain('accessToken');
      expect(serialized).not.toContain('refreshToken');
    });

    it('does not throw when Redis errors (best-effort write)', async () => {
      mockRedisClient.setEx.mockRejectedValue(new Error('write failed'));

      await expect(cache.set('brand-1', [])).resolves.toBeUndefined();
    });
  });

  describe('invalidateBrand', () => {
    it('deletes the brand key', async () => {
      await cache.invalidateBrand('brand-1');

      expect(mockRedisClient.del).toHaveBeenCalledWith(`${REDIS_NAMESPACES.SOCIAL_METRICS}:brand-1`);
    });

    it('does not throw when Redis errors', async () => {
      mockRedisClient.del.mockRejectedValue(new Error('connection reset'));

      await expect(cache.invalidateBrand('brand-1')).resolves.toBeUndefined();
    });
  });
});
