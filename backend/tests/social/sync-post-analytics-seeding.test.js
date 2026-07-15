/**
 * Seeding Watchdog Tests — sync-post-analytics.service.js
 *
 * Verifies the atomic seeding-status watchdog described in implementation_plan_3.md:
 * 1. COMPLETED short-circuits (no seeding job runs again)
 * 2. Fresh IN_PROGRESS is left alone (another instance is legitimately seeding/paused on quota)
 * 3. Stale IN_PROGRESS (past LOCK_TTL.SEED_WATCHDOG_TIMEOUT) is detected and seeding restarts
 * 4. NOT_STARTED / missing status triggers seeding
 * 5. Redis down (fail-open) skips the lock check entirely rather than blocking
 */

jest.mock('../../src/config/redis', () => ({
  get: jest.fn(),
  setEx: jest.fn(),
  ping: jest.fn()
}));
jest.mock('../../src/services/social/distributed-lock.service', () => {
  return jest.fn().mockImplementation(() => ({
    acquireLock: jest.fn(),
    releaseLock: jest.fn()
  }));
});
jest.mock('../../src/services/social/quota-tracker.service', () => {
  return jest.fn().mockImplementation(() => ({
    hasExceededThreshold: jest.fn().mockResolvedValue(false),
    getCurrentUsage: jest.fn().mockResolvedValue(0)
  }));
});
jest.mock('../../src/services/social/redis-health.service', () => {
  return jest.fn().mockImplementation(() => ({
    shouldFailOpen: jest.fn().mockResolvedValue(false)
  }));
});
jest.mock('../../src/services/social/post-metric-sync.service', () => ({
  syncPostMetrics: jest.fn().mockResolvedValue(undefined)
}));
jest.mock('../../src/config/prisma', () => ({
  post: { findMany: jest.fn().mockResolvedValue([]) },
  postAnalyticsDailySnapshot: { deleteMany: jest.fn(), findMany: jest.fn() },
  socialAccount: { findMany: jest.fn() }
}));

const redisMock = require('../../src/config/redis');
const { REDIS_KEYS, SEED_STATUS, LOCK_TTL } = require('../../src/constants/analytics-snapshot.constants');
const syncPostAnalyticsService = require('../../src/services/social/sync-post-analytics.service');

describe('SyncPostAnalyticsService — seeding watchdog', () => {
  const lockInstance = syncPostAnalyticsService.lockService;
  const redisHealthInstance = syncPostAnalyticsService.redisHealthService;

  beforeEach(() => {
    jest.clearAllMocks();
    lockInstance.acquireLock.mockResolvedValue('check-token');
    lockInstance.releaseLock.mockResolvedValue(1);
    redisHealthInstance.shouldFailOpen.mockResolvedValue(false);
  });

  it('short-circuits when SEED_STATUS is COMPLETED, without starting a new seeding job', async () => {
    redisMock.get.mockImplementation(async (key) => {
      if (key === REDIS_KEYS.SEED_STATUS) return SEED_STATUS.COMPLETED;
      return null;
    });

    await syncPostAnalyticsService.maybeRunSeeding();

    expect(redisMock.setEx).not.toHaveBeenCalled();
    expect(lockInstance.releaseLock).toHaveBeenCalledWith(REDIS_KEYS.SEED_CHECK_LOCK, 'check-token');
  });

  it('leaves a fresh IN_PROGRESS status alone (not past the watchdog timeout)', async () => {
    const recentStart = Date.now() - 60_000; // 1 minute ago, well under the 2h timeout
    redisMock.get.mockImplementation(async (key) => {
      if (key === REDIS_KEYS.SEED_STATUS) return SEED_STATUS.IN_PROGRESS;
      if (key === REDIS_KEYS.SEED_STARTED_AT) return String(recentStart);
      return null;
    });

    await syncPostAnalyticsService.maybeRunSeeding();

    // Should NOT overwrite the in-progress status — another instance owns it
    expect(redisMock.setEx).not.toHaveBeenCalledWith(
      REDIS_KEYS.SEED_STATUS, expect.any(Number), SEED_STATUS.IN_PROGRESS
    );
  });

  it('restarts seeding when IN_PROGRESS is stale (older than SEED_WATCHDOG_TIMEOUT)', async () => {
    const staleStart = Date.now() - (LOCK_TTL.SEED_WATCHDOG_TIMEOUT * 1000 + 60_000); // past the timeout
    redisMock.get.mockImplementation(async (key) => {
      if (key === REDIS_KEYS.SEED_STATUS) return SEED_STATUS.IN_PROGRESS;
      if (key === REDIS_KEYS.SEED_STARTED_AT) return String(staleStart);
      return null;
    });

    await syncPostAnalyticsService.maybeRunSeeding();

    expect(redisMock.setEx).toHaveBeenCalledWith(
      REDIS_KEYS.SEED_STATUS, LOCK_TTL.SEED_STATUS_INPROGRESS, SEED_STATUS.IN_PROGRESS
    );
    expect(redisMock.setEx).toHaveBeenCalledWith(
      REDIS_KEYS.SEED_STARTED_AT, LOCK_TTL.SEED_STATUS_INPROGRESS, expect.any(String)
    );
  });

  it('triggers seeding when SEED_STATUS is NOT_STARTED / missing', async () => {
    redisMock.get.mockResolvedValue(null); // key doesn't exist yet

    await syncPostAnalyticsService.maybeRunSeeding();

    expect(redisMock.setEx).toHaveBeenCalledWith(
      REDIS_KEYS.SEED_STATUS, LOCK_TTL.SEED_STATUS_INPROGRESS, SEED_STATUS.IN_PROGRESS
    );
  });

  it('marks status COMPLETED once the seeding job finishes with no posts left to seed', async () => {
    redisMock.get.mockResolvedValue(null);

    await syncPostAnalyticsService.maybeRunSeeding();

    expect(redisMock.setEx).toHaveBeenCalledWith(
      REDIS_KEYS.SEED_STATUS, LOCK_TTL.SEED_STATUS_INPROGRESS, SEED_STATUS.COMPLETED
    );
  });

  it('reads status and overwrites the timestamp inside the SAME lock hold (atomicity)', async () => {
    const staleStart = Date.now() - (LOCK_TTL.SEED_WATCHDOG_TIMEOUT * 1000 + 60_000);
    let lockReleased = false;
    lockInstance.releaseLock.mockImplementation(async () => { lockReleased = true; return 1; });
    redisMock.get.mockImplementation(async (key) => {
      // The status read + overwrite must both happen before the lock is released.
      expect(lockReleased).toBe(false);
      if (key === REDIS_KEYS.SEED_STATUS) return SEED_STATUS.IN_PROGRESS;
      if (key === REDIS_KEYS.SEED_STARTED_AT) return String(staleStart);
      return null;
    });
    redisMock.setEx.mockImplementation(async () => {
      expect(lockReleased).toBe(false);
    });

    await syncPostAnalyticsService.maybeRunSeeding();

    expect(lockReleased).toBe(true);
  });

  it('does not attempt to check/acquire the seed-check lock when Redis is down (fail-open)', async () => {
    redisHealthInstance.shouldFailOpen.mockResolvedValue(true);

    await syncPostAnalyticsService.maybeRunSeeding();

    expect(lockInstance.acquireLock).not.toHaveBeenCalled();
  });

  it('does nothing when another instance already holds the seed-check lock', async () => {
    lockInstance.acquireLock.mockResolvedValue(null);

    await syncPostAnalyticsService.maybeRunSeeding();

    expect(redisMock.get).not.toHaveBeenCalled();
    expect(lockInstance.releaseLock).not.toHaveBeenCalled();
  });
});
