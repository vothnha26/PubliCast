/**
 * Dashboard Metrics Cache Service Tests
 *
 * Cache-Aside for AnalyticsFacade.getAggregatedData:
 * 1. get() returns null on miss / parses JSON on hit
 * 2. set() writes the entry with the correct TTL and registers it in the
 *    brand's tag set (so invalidateBrand can find it without SCAN)
 * 3. invalidateBrand() deletes every tagged key plus the tag set itself
 * 4. Redis errors are swallowed — cache is best-effort, never blocks the read path
 */

const DashboardMetricsCacheService = require('../../src/services/reports/dashboard-metrics-cache.service');
const { REDIS_NAMESPACES, REDIS_TTL } = require('../../src/utils/constants');

const mockRedisClient = {
  get: jest.fn(),
  setEx: jest.fn(),
  sAdd: jest.fn(),
  sMembers: jest.fn(),
  expire: jest.fn(),
  del: jest.fn()
};

describe('DashboardMetricsCacheService', () => {
  let cache;

  beforeEach(() => {
    jest.clearAllMocks();
    cache = new DashboardMetricsCacheService(mockRedisClient);
  });

  describe('get', () => {
    it('returns null on cache miss', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const result = await cache.get('brand-1', '2026-08-01', '2026-08-10', ['FACEBOOK'], null);

      expect(result).toBeNull();
    });

    it('parses and returns the cached payload on hit', async () => {
      const payload = { overview: { reach: 100 } };
      mockRedisClient.get.mockResolvedValue(JSON.stringify(payload));

      const result = await cache.get('brand-1', '2026-08-01', '2026-08-10', ['FACEBOOK'], null);

      expect(result).toEqual(payload);
    });

    it('returns null (not throw) when Redis errors', async () => {
      mockRedisClient.get.mockRejectedValue(new Error('connection reset'));

      const result = await cache.get('brand-1', '2026-08-01', '2026-08-10', ['FACEBOOK'], null);

      expect(result).toBeNull();
    });

    it('builds the same key regardless of platforms array order', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      await cache.get('brand-1', '2026-08-01', '2026-08-10', ['YOUTUBE', 'FACEBOOK'], null);
      await cache.get('brand-1', '2026-08-01', '2026-08-10', ['FACEBOOK', 'YOUTUBE'], null);

      const [keyA] = mockRedisClient.get.mock.calls[0];
      const [keyB] = mockRedisClient.get.mock.calls[1];
      expect(keyA).toBe(keyB);
    });
  });

  describe('set', () => {
    it('writes the entry with REDIS_TTL.DASHBOARD_METRICS_SEC and tags it under the brand', async () => {
      const payload = { overview: { reach: 100 } };

      await cache.set('brand-1', '2026-08-01', '2026-08-10', ['FACEBOOK'], null, payload);

      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        expect.stringContaining(`${REDIS_NAMESPACES.DASHBOARD_METRICS}:brand-1:`),
        REDIS_TTL.DASHBOARD_METRICS_SEC,
        JSON.stringify(payload)
      );
      expect(mockRedisClient.sAdd).toHaveBeenCalledWith(
        `${REDIS_NAMESPACES.DASHBOARD_METRICS}:tags:brand-1`,
        expect.stringContaining(`${REDIS_NAMESPACES.DASHBOARD_METRICS}:brand-1:`)
      );
    });

    it('does not throw when Redis errors (best-effort write)', async () => {
      mockRedisClient.setEx.mockRejectedValue(new Error('write failed'));

      await expect(
        cache.set('brand-1', '2026-08-01', '2026-08-10', ['FACEBOOK'], null, {})
      ).resolves.toBeUndefined();
    });
  });

  describe('invalidateBrand', () => {
    it('deletes every tagged key plus the tag set', async () => {
      mockRedisClient.sMembers.mockResolvedValue(['dash:metrics:brand-1:a', 'dash:metrics:brand-1:b']);

      await cache.invalidateBrand('brand-1');

      expect(mockRedisClient.del).toHaveBeenCalledWith(['dash:metrics:brand-1:a', 'dash:metrics:brand-1:b']);
      expect(mockRedisClient.del).toHaveBeenCalledWith(`${REDIS_NAMESPACES.DASHBOARD_METRICS}:tags:brand-1`);
    });

    it('skips the bulk del when there are no tagged keys, but still clears the tag set', async () => {
      mockRedisClient.sMembers.mockResolvedValue([]);

      await cache.invalidateBrand('brand-1');

      expect(mockRedisClient.del).toHaveBeenCalledTimes(1);
      expect(mockRedisClient.del).toHaveBeenCalledWith(`${REDIS_NAMESPACES.DASHBOARD_METRICS}:tags:brand-1`);
    });

    it('does not throw when Redis errors', async () => {
      mockRedisClient.sMembers.mockRejectedValue(new Error('connection reset'));

      await expect(cache.invalidateBrand('brand-1')).resolves.toBeUndefined();
    });
  });
});
