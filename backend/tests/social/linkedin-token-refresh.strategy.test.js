const LinkedInTokenRefreshStrategy = require('../../src/services/social/token-refresh/strategies/linkedin-token-refresh.strategy');
const { PLATFORMS } = require('../../src/utils/constants');

describe('LinkedInTokenRefreshStrategy (#70)', () => {
  let strategy;
  const OLD_ENV = process.env;

  beforeEach(() => {
    process.env = { ...OLD_ENV, LINKEDIN_CLIENT_ID: 'client-id', LINKEDIN_CLIENT_SECRET: 'client-secret' };
    strategy = new LinkedInTokenRefreshStrategy();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    process.env = OLD_ENV;
    jest.restoreAllMocks();
  });

  it('registers under the LINKEDIN platform', () => {
    expect(strategy.platform).toBe(PLATFORMS.LINKEDIN);
  });

  describe('canRefresh', () => {
    it('returns false when the account has no refreshToken (never enrolled in LinkedIn\'s refresh program)', () => {
      expect(strategy.canRefresh({ id: 'acc-1', refreshToken: null })).toBe(false);
    });

    it('returns true when the account has a refreshToken', () => {
      expect(strategy.canRefresh({ id: 'acc-1', refreshToken: 'some-refresh-token' })).toBe(true);
    });
  });

  describe('refresh', () => {
    it('exchanges the refresh_token for a new access_token', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ access_token: 'new-access-token', expires_in: 5184000 })
      });

      const result = await strategy.refresh({ id: 'acc-1', refreshToken: 'old-refresh-token' });

      expect(global.fetch).toHaveBeenCalledWith(
        'https://www.linkedin.com/oauth/v2/accessToken',
        expect.objectContaining({ method: 'POST' })
      );
      const [, options] = global.fetch.mock.calls[0];
      const bodyStr = options.body.toString();
      expect(bodyStr).toContain('grant_type=refresh_token');
      expect(bodyStr).toContain('refresh_token=old-refresh-token');

      expect(result.accessToken).toBe('new-access-token');
      expect(result.refreshToken).toBe('old-refresh-token'); // falls back since response didn't rotate it
      expect(result.expiresAt).toBeInstanceOf(Date);
    });

    it('uses the rotated refresh_token from the response when LinkedIn provides one', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ access_token: 'new-access-token', refresh_token: 'rotated-refresh-token', expires_in: 5184000 })
      });

      const result = await strategy.refresh({ id: 'acc-1', refreshToken: 'old-refresh-token' });

      expect(result.refreshToken).toBe('rotated-refresh-token');
    });

    it('throws a clear error when the API call fails', async () => {
      global.fetch.mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ error_description: 'invalid_grant' })
      });

      await expect(strategy.refresh({ id: 'acc-1', refreshToken: 'old-refresh-token' }))
        .rejects.toThrow('invalid_grant');
    });

    it('throws when LINKEDIN_CLIENT_ID/SECRET are not configured', async () => {
      process.env.LINKEDIN_CLIENT_ID = '';
      process.env.LINKEDIN_CLIENT_SECRET = '';
      strategy = new LinkedInTokenRefreshStrategy();

      await expect(strategy.refresh({ id: 'acc-1', refreshToken: 'x' }))
        .rejects.toThrow('LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET must be configured');
    });
  });
});
