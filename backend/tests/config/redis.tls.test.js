/**
 * Regression test for #118 M3: rejectUnauthorized was hardcoded to false on
 * every rediss:// (TLS) connection, disabling certificate verification and
 * exposing the connection (which carries login-attempt counters and cache
 * data) to a MITM. It must now default to verifying the cert, with an
 * explicit opt-out only via REDIS_TLS_ALLOW_SELF_SIGNED=true.
 */
jest.mock('redis', () => ({
  createClient: jest.fn().mockReturnValue({
    on: jest.fn(),
    connect: jest.fn().mockResolvedValue(undefined)
  })
}));
jest.mock('../../src/utils/logger', () => ({
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  debug: jest.fn()
}));

describe('config/redis.js TLS certificate verification (#118 M3)', () => {
  const ORIGINAL_ENV = { ...process.env };

  beforeEach(() => {
    // jest.resetModules() would also reset the mocked 'redis' module
    // registry, orphaning this file's `createClient` reference from a fresh
    // (unmocked) instance required inside config/redis.js — so each test
    // re-requires `createClient` fresh right after resetting.
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV };
    process.env.USE_MEMORY_REDIS = 'false';
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it('verifies the TLS certificate by default on a rediss:// URL', () => {
    process.env.REDIS_URL = 'rediss://redis.example.com:6380';
    delete process.env.REDIS_TLS_ALLOW_SELF_SIGNED;

    const { createClient } = require('redis');
    require('../../src/config/redis');

    const socketOpts = createClient.mock.calls[0][0].socket;
    expect(socketOpts.tls).toBe(true);
    expect(socketOpts.rejectUnauthorized).toBe(true);
  });

  it('only disables verification when REDIS_TLS_ALLOW_SELF_SIGNED is explicitly true', () => {
    process.env.REDIS_URL = 'rediss://redis.example.com:6380';
    process.env.REDIS_TLS_ALLOW_SELF_SIGNED = 'true';

    const { createClient } = require('redis');
    require('../../src/config/redis');

    const socketOpts = createClient.mock.calls[0][0].socket;
    expect(socketOpts.rejectUnauthorized).toBe(false);
  });

  it('does not set tls options at all for a plain redis:// URL', () => {
    process.env.REDIS_URL = 'redis://redis.example.com:6379';
    delete process.env.REDIS_TLS_ALLOW_SELF_SIGNED;

    const { createClient } = require('redis');
    require('../../src/config/redis');

    const socketOpts = createClient.mock.calls[0][0].socket;
    expect(socketOpts.tls).toBeUndefined();
    expect(socketOpts.rejectUnauthorized).toBeUndefined();
  });
});
