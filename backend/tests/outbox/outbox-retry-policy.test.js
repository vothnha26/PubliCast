const { computeNextRunAt, isExhausted, decideRetryOutcome } = require('../../src/services/core/outbox-retry-policy');

describe('outbox-retry-policy', () => {
  const config = {
    BACKOFF_BASE_MS: 5000,
    BACKOFF_FACTOR: 2,
    BACKOFF_MAX_MS: 5 * 60 * 1000
  };
  const now = new Date('2026-01-01T00:00:00.000Z');

  describe('computeNextRunAt', () => {
    it('returns now + BACKOFF_BASE_MS for attempts=1', () => {
      const result = computeNextRunAt(1, now, config);
      expect(result.getTime()).toBe(now.getTime() + 5000);
    });

    it('applies exponential backoff for later attempts', () => {
      const result = computeNextRunAt(4, now, config);
      // 5000 * 2^3 = 40000
      expect(result.getTime()).toBe(now.getTime() + 40000);
    });

    it('caps delay at BACKOFF_MAX_MS for very high attempts', () => {
      const result = computeNextRunAt(10, now, config);
      expect(result.getTime()).toBe(now.getTime() + config.BACKOFF_MAX_MS);
    });
  });

  describe('isExhausted', () => {
    it('returns true when attempts reached maxAttempts', () => {
      expect(isExhausted(5, 5)).toBe(true);
    });

    it('returns false when attempts below maxAttempts', () => {
      expect(isExhausted(4, 5)).toBe(false);
    });
  });

  describe('decideRetryOutcome', () => {
    it('returns RETRY with correct nextRunAt when attempts remain', () => {
      const row = { attempts: 1, maxAttempts: 5 };
      const error = new Error('Redis unavailable');

      const result = decideRetryOutcome(row, error, now);

      expect(result.outcome).toBe('RETRY');
      expect(result.attempts).toBe(2);
      expect(result.lastError).toBe('Redis unavailable');
      expect(result.nextRunAt.getTime()).toBe(now.getTime() + 5000 * Math.pow(2, 1));
    });

    it('returns DEAD_LETTER when this attempt exhausts maxAttempts', () => {
      const row = { attempts: 4, maxAttempts: 5 };
      const error = new Error('Still failing');

      const result = decideRetryOutcome(row, error, now);

      expect(result.outcome).toBe('DEAD_LETTER');
      expect(result.attempts).toBe(5);
      expect(result.lastError).toBe('Still failing');
      expect(result.nextRunAt).toBeUndefined();
    });
  });
});
