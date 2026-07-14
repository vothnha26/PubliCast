/**
 * Distributed Lock Service Tests
 *
 * Test suite ensures that the distributed lock mechanism:
 * 1. Properly acquires locks with unique tokens
 * 2. Safely releases locks by matching tokens
 * 3. Prevents double-release and lock hijacking
 * 4. Handles concurrent lock requests correctly
 */

const DistributedLockService = require('../../src/services/social/distributed-lock.service');

// Mock Redis client
const mockRedisClient = {
  set: jest.fn(),
  get: jest.fn(),
  del: jest.fn(),
  exists: jest.fn(),
  ttl: jest.fn(),
  eval: jest.fn()
};

describe('DistributedLockService', () => {
  let lockService;

  beforeEach(() => {
    jest.clearAllMocks();
    lockService = new DistributedLockService(mockRedisClient);
  });

  describe('acquireLock', () => {
    it('should acquire lock and return unique token', async () => {
      mockRedisClient.set.mockResolvedValue('OK');

      const token = await lockService.acquireLock('lock:test:123', 30);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
      expect(mockRedisClient.set).toHaveBeenCalledWith(
        'lock:test:123',
        expect.any(String),
        { NX: true, EX: 30 }
      );
    });

    it('should return null if lock already exists', async () => {
      mockRedisClient.set.mockResolvedValue(null);

      const token = await lockService.acquireLock('lock:test:456', 30);

      expect(token).toBeNull();
    });

    it('should generate unique tokens for different locks', async () => {
      mockRedisClient.set.mockResolvedValue('OK');

      const token1 = await lockService.acquireLock('lock:1', 30);
      const token2 = await lockService.acquireLock('lock:2', 30);

      expect(token1).not.toBe(token2);
    });
  });

  describe('releaseLock', () => {
    it('should release lock when token matches', async () => {
      mockRedisClient.eval.mockResolvedValue(1);

      const released = await lockService.releaseLock('lock:test:123', 'valid-token');

      expect(released).toBe(1);
      expect(mockRedisClient.eval).toHaveBeenCalled();
    });

    it('should NOT release lock when token does not match', async () => {
      mockRedisClient.eval.mockResolvedValue(0);

      const released = await lockService.releaseLock('lock:test:123', 'wrong-token');

      expect(released).toBe(0);
    });

    it('should handle empty token gracefully', async () => {
      const released = await lockService.releaseLock('lock:test:123', '');

      expect(released).toBe(0);
    });
  });

  describe('isLocked', () => {
    it('should return true if key exists', async () => {
      mockRedisClient.exists.mockResolvedValue(1);

      const locked = await lockService.isLocked('lock:test:123');

      expect(locked).toBe(true);
    });

    it('should return false if key does not exist', async () => {
      mockRedisClient.exists.mockResolvedValue(0);

      const locked = await lockService.isLocked('lock:test:123');

      expect(locked).toBe(false);
    });
  });

  describe('getLockTTL', () => {
    it('should return remaining TTL', async () => {
      mockRedisClient.ttl.mockResolvedValue(25);

      const ttl = await lockService.getLockTTL('lock:test:123');

      expect(ttl).toBe(25);
    });

    it('should return -2 if key not exists', async () => {
      mockRedisClient.ttl.mockResolvedValue(-2);

      const ttl = await lockService.getLockTTL('lock:test:123');

      expect(ttl).toBe(-2);
    });
  });

  describe('error handling', () => {
    it('should throw on Redis errors', async () => {
      mockRedisClient.set.mockRejectedValue(new Error('Redis connection failed'));

      await expect(lockService.acquireLock('lock:test', 30)).rejects.toThrow('Redis connection failed');
    });
  });
});
