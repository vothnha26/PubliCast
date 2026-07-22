/**
 * Regression tests for #62: TikTok rotates refresh_token on every use (the
 * previous refresh_token is invalidated the moment a new one is issued).
 * getOrRefreshAccount previously had no per-account lock, so two concurrent
 * callers reading the same expired account could both refresh with the same
 * (still-valid) old refresh_token; whichever DB write landed last would leave
 * the account holding a refresh_token TikTok had already invalidated,
 * bricking it until the user reconnects.
 *
 * A fake in-memory lock + a fake socialAccountRepository are used so this
 * test can deterministically simulate "another caller already refreshed
 * while we were waiting for the lock" without touching real Redis/DB.
 */
jest.mock('../../src/config/redis', () => ({}));
jest.mock('../../src/services/social/tiktok/tiktok.gateway');
jest.mock('../../src/repositories/social/social-account.repository');
jest.mock('../../src/services/social/distributed-lock.service', () => {
  // Minimal in-memory single-holder lock — deterministic stand-in for Redis's
  // SET NX EX, enough to exercise the acquire/double-check/release flow
  // without a real Redis connection.
  const held = new Map();
  return jest.fn().mockImplementation(() => ({
    acquireLock: jest.fn(async (key) => {
      if (held.has(key)) return null;
      const token = `tok-${Math.random()}`;
      held.set(key, token);
      return token;
    }),
    releaseLock: jest.fn(async (key, token) => {
      if (held.get(key) === token) {
        held.delete(key);
        return 1;
      }
      return 0;
    }),
    isLocked: jest.fn(async (key) => held.has(key))
  }));
});

const tiktokGateway = require('../../src/services/social/tiktok/tiktok.gateway');
const socialAccountRepository = require('../../src/repositories/social/social-account.repository');
const tiktokAnalyticsService = require('../../src/services/social/tiktok/tiktok-analytics.service');

function expiredAccount(overrides = {}) {
  return {
    id: 'acct-1',
    accessToken: 'old-access-token',
    refreshToken: 'old-refresh-token',
    tokenExpiresAt: new Date(Date.now() - 60_000), // already expired
    ...overrides
  };
}

describe('TikTokAnalyticsService.getOrRefreshAccount lock (#62)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the account unchanged when the token is not expired', async () => {
    const freshAccount = expiredAccount({ tokenExpiresAt: new Date(Date.now() + 3600_000) });

    const result = await tiktokAnalyticsService.getOrRefreshAccount(freshAccount);

    expect(result).toBe(freshAccount);
    expect(tiktokGateway.refreshAccessToken).not.toHaveBeenCalled();
  });

  it('refreshes once and persists the new tokens when the lock is acquired', async () => {
    const account = expiredAccount();
    socialAccountRepository.findById.mockResolvedValue(account);
    tiktokGateway.refreshAccessToken.mockResolvedValue({
      access_token: 'new-access-token',
      refresh_token: 'new-refresh-token',
      expires_in: 3600
    });
    socialAccountRepository.updateTokens.mockResolvedValue({ ...account, accessToken: 'new-access-token' });

    const result = await tiktokAnalyticsService.getOrRefreshAccount(account);

    expect(tiktokGateway.refreshAccessToken).toHaveBeenCalledTimes(1);
    expect(socialAccountRepository.updateTokens).toHaveBeenCalledWith('acct-1', expect.objectContaining({
      access_token: 'new-access-token',
      refresh_token: 'new-refresh-token'
    }));
    expect(result.accessToken).toBe('new-access-token');
  });

  it('does not re-refresh if the double-check inside the lock finds the token already renewed', async () => {
    const account = expiredAccount();
    const alreadyRenewed = { ...account, tokenExpiresAt: new Date(Date.now() + 3600_000), accessToken: 'renewed-by-other-caller' };
    // A concurrent caller already refreshed and released the lock by the
    // time this caller's double-check read runs.
    socialAccountRepository.findById.mockResolvedValue(alreadyRenewed);

    const result = await tiktokAnalyticsService.getOrRefreshAccount(account);

    expect(tiktokGateway.refreshAccessToken).not.toHaveBeenCalled();
    expect(result).toBe(alreadyRenewed);
  });

  it('marks the account as needing reconnection when the refresh_token is invalid_grant', async () => {
    const account = expiredAccount();
    socialAccountRepository.findById.mockResolvedValue(account);
    const err = new Error('invalid_grant');
    err.code = 'invalid_grant';
    tiktokGateway.refreshAccessToken.mockRejectedValue(err);
    socialAccountRepository.markNeedsReauth.mockResolvedValue({ ...account, isConnected: false });

    const result = await tiktokAnalyticsService.getOrRefreshAccount(account);

    expect(socialAccountRepository.markNeedsReauth).toHaveBeenCalledWith('acct-1');
    // Falls back to returning the original (stale) account rather than throwing.
    expect(result).toBe(account);
  });

  it('does not mark needs-reauth for a transient (non invalid_grant) refresh failure', async () => {
    const account = expiredAccount();
    socialAccountRepository.findById.mockResolvedValue(account);
    tiktokGateway.refreshAccessToken.mockRejectedValue(new Error('network timeout'));

    const result = await tiktokAnalyticsService.getOrRefreshAccount(account);

    expect(socialAccountRepository.markNeedsReauth).not.toHaveBeenCalled();
    expect(result).toBe(account);
  });
});
