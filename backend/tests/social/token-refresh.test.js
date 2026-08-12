const BaseTokenRefreshStrategy = require('../../src/services/social/token-refresh/strategies/base-token-refresh.strategy');
const FacebookTokenRefreshStrategy = require('../../src/services/social/token-refresh/strategies/facebook-token-refresh.strategy');
const ThreadsTokenRefreshStrategy = require('../../src/services/social/token-refresh/strategies/threads-token-refresh.strategy');
const tokenRefreshRegistry = require('../../src/services/social/token-refresh/token-refresh.registry');
const { PLATFORMS } = require('../../src/utils/constants');

describe('BaseTokenRefreshStrategy', () => {
  it('throws when constructed without a platform', () => {
    expect(() => new BaseTokenRefreshStrategy()).toThrow('Platform identifier is required');
  });

  it('stores the platform and defaults canRefresh to true', () => {
    const strategy = new BaseTokenRefreshStrategy(PLATFORMS.FACEBOOK);
    expect(strategy.platform).toBe(PLATFORMS.FACEBOOK);
    expect(strategy.canRefresh({})).toBe(true);
  });

  it('refresh() rejects as not implemented by default', async () => {
    const strategy = new BaseTokenRefreshStrategy(PLATFORMS.FACEBOOK);
    await expect(strategy.refresh({})).rejects.toThrow(`Method 'refresh' must be implemented for strategy: ${PLATFORMS.FACEBOOK}`);
  });
});

describe('FacebookTokenRefreshStrategy', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.resetAllMocks();
    process.env = { ...OLD_ENV, FACEBOOK_APP_ID: 'app-id', FACEBOOK_APP_SECRET: 'app-secret' };
    global.fetch = jest.fn();
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  it('throws when app credentials are not configured', async () => {
    process.env.FACEBOOK_APP_ID = '';
    process.env.FACEBOOK_APP_SECRET = '';
    const strategy = new FacebookTokenRefreshStrategy();
    await expect(strategy.refresh({ id: 'acc-1', accessToken: 'tok' }))
      .rejects.toThrow('FACEBOOK_APP_ID and FACEBOOK_APP_SECRET must be configured');
  });

  it('exchanges the token and returns a long-lived access token with expiry', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ access_token: 'new-token', expires_in: 3600 })
    });

    const strategy = new FacebookTokenRefreshStrategy();
    const before = Date.now();
    const result = await strategy.refresh({ id: 'acc-1', accessToken: 'old-token' });

    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('fb_exchange_token=old-token'));
    expect(result.accessToken).toBe('new-token');
    expect(result.refreshToken).toBeNull();
    expect(result.expiresAt.getTime()).toBeGreaterThanOrEqual(before + 3600 * 1000);
  });

  it('returns a null expiresAt when the API omits expires_in', async () => {
    global.fetch.mockResolvedValue({ ok: true, json: async () => ({ access_token: 'new-token' }) });
    const strategy = new FacebookTokenRefreshStrategy();
    const result = await strategy.refresh({ id: 'acc-1', accessToken: 'old-token' });
    expect(result.expiresAt).toBeNull();
  });

  it('throws using the API error message when the response is not ok', async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ error: { message: 'Invalid token' } })
    });
    const strategy = new FacebookTokenRefreshStrategy();
    await expect(strategy.refresh({ id: 'acc-1', accessToken: 'old-token' })).rejects.toThrow('Invalid token');
  });

  it('falls back to a status-based error when the error body is not JSON', async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => { throw new Error('not json'); }
    });
    const strategy = new FacebookTokenRefreshStrategy();
    await expect(strategy.refresh({ id: 'acc-1', accessToken: 'old-token' }))
      .rejects.toThrow('Facebook Token Exchange API returned status 500');
  });

  it('throws when the response has no access_token', async () => {
    global.fetch.mockResolvedValue({ ok: true, json: async () => ({}) });
    const strategy = new FacebookTokenRefreshStrategy();
    await expect(strategy.refresh({ id: 'acc-1', accessToken: 'old-token' }))
      .rejects.toThrow('did not contain access_token');
  });
});

describe('ThreadsTokenRefreshStrategy', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    global.fetch = jest.fn();
  });

  it('refreshes the token and returns expiry', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ access_token: 'new-threads-token', expires_in: 5184000 })
    });

    const strategy = new ThreadsTokenRefreshStrategy();
    const result = await strategy.refresh({ id: 'acc-2', accessToken: 'old-token' });

    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('th_refresh_token'));
    expect(result.accessToken).toBe('new-threads-token');
    expect(result.refreshToken).toBeNull();
    expect(result.expiresAt).toBeInstanceOf(Date);
  });

  it('throws using error_message when the response is not ok', async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error_message: 'Bad token' })
    });
    const strategy = new ThreadsTokenRefreshStrategy();
    await expect(strategy.refresh({ id: 'acc-2', accessToken: 'old-token' })).rejects.toThrow('Bad token');
  });

  it('throws when the response has no access_token', async () => {
    global.fetch.mockResolvedValue({ ok: true, json: async () => ({}) });
    const strategy = new ThreadsTokenRefreshStrategy();
    await expect(strategy.refresh({ id: 'acc-2', accessToken: 'old-token' }))
      .rejects.toThrow('did not contain access_token');
  });
});

describe('TokenRefreshRegistry', () => {
  it('returns the Facebook strategy for FACEBOOK', () => {
    const strategy = tokenRefreshRegistry.getStrategy(PLATFORMS.FACEBOOK);
    expect(strategy).toBeInstanceOf(FacebookTokenRefreshStrategy);
  });

  it('returns the Threads strategy for THREADS', () => {
    const strategy = tokenRefreshRegistry.getStrategy(PLATFORMS.THREADS);
    expect(strategy).toBeInstanceOf(ThreadsTokenRefreshStrategy);
  });

  it('maps Instagram to the same Facebook strategy instance', () => {
    const fbStrategy = tokenRefreshRegistry.getStrategy(PLATFORMS.FACEBOOK);
    const igStrategy = tokenRefreshRegistry.getStrategy(PLATFORMS.INSTAGRAM);
    expect(igStrategy).toBe(fbStrategy);
  });

  it('returns null for an unsupported platform', () => {
    expect(tokenRefreshRegistry.getStrategy('NOT_A_PLATFORM')).toBeNull();
  });

  it('lists all supported platforms', () => {
    const platforms = tokenRefreshRegistry.getSupportedPlatforms();
    expect(platforms).toEqual(expect.arrayContaining([PLATFORMS.FACEBOOK, PLATFORMS.THREADS, PLATFORMS.INSTAGRAM]));
  });
});
