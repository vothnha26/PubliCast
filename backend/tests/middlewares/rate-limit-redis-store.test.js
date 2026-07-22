/**
 * Regression test for #118 M1: authRateLimiter / forgotPasswordRateLimiter /
 * resetPasswordRateLimiter previously used express-rate-limit's default
 * in-memory store — on a multi-instance deployment the effective limit
 * multiplies by instance count, and a process restart wipes counters
 * entirely, silently weakening the brute-force guard. They must now use a
 * Redis-backed store (rate-limit-redis's RedisStore, wired to the shared
 * Redis client).
 */
jest.mock('../../src/config/redis', () => ({
  sendCommand: jest.fn()
}));

const constructorCalls = [];
jest.mock('rate-limit-redis', () => {
  const ActualRedisStore = jest.requireActual('rate-limit-redis').RedisStore;
  return {
    RedisStore: class extends ActualRedisStore {
      constructor(opts) {
        constructorCalls.push(opts);
        super(opts);
      }
    }
  };
});

describe('Rate limiters use a Redis-backed store (#118 M1)', () => {
  beforeEach(() => {
    constructorCalls.length = 0;
  });

  it('constructs authRateLimiter with a RedisStore using the shared redis client', () => {
    require('../../src/middlewares/rate-limit.middleware');

    expect(constructorCalls).toContainEqual(expect.objectContaining({
      prefix: 'rl:auth:',
      sendCommand: expect.any(Function)
    }));
  });

  it('constructs forgotPasswordRateLimiter and resetPasswordRateLimiter each with their own RedisStore', () => {
    require('../../src/middlewares/password-reset-rate-limit.middleware');

    expect(constructorCalls).toContainEqual(expect.objectContaining({ prefix: 'rl:forgot-password:' }));
    expect(constructorCalls).toContainEqual(expect.objectContaining({ prefix: 'rl:reset-password:' }));
  });
});
