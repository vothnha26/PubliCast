jest.mock('../../src/repositories/social/social-account.repository', () => ({
  findById: jest.fn(),
  findByBrandAndPlatform: jest.fn(),
  updateTokens: jest.fn()
}));

jest.mock('../../src/services/social/google-oauth.service', () => ({
  createClient: jest.fn()
}));

jest.mock('../../src/services/social/tiktok/tiktok-analytics.service', () => ({
  getOrRefreshAccount: jest.fn()
}));

jest.mock('../../src/services/social/bluesky/bluesky.service', () => ({
  getAgentForAccount: jest.fn()
}));

const socialAuthFactory = require('../../src/core/auth/social-auth.factory');
const socialAccountRepository = require('../../src/repositories/social/social-account.repository');
const { PLATFORMS } = require('../../src/utils/constants');

describe('SocialAuthFactory', () => {
  beforeEach(() => jest.resetAllMocks());

  describe('getAuthClient', () => {
    it('returns null for an unsupported platform', async () => {
      const result = await socialAuthFactory.getAuthClient('brand-1', 'REDDIT');
      expect(result).toBeNull();
    });

    it('returns null when no accounts are connected for the platform', async () => {
      socialAccountRepository.findByBrandAndPlatform.mockResolvedValue([]);
      const result = await socialAuthFactory.getAuthClient('brand-1', PLATFORMS.FACEBOOK);
      expect(result).toBeNull();
    });
  });

  describe('Facebook auth client', () => {
    it('picks the first non-mock account as active', async () => {
      socialAccountRepository.findByBrandAndPlatform.mockResolvedValue([
        { id: 'acc-mock', accessToken: 'mock-token' },
        { id: 'acc-real', accessToken: 'real-token' }
      ]);

      const result = await socialAuthFactory.getAuthClient('brand-1', PLATFORMS.FACEBOOK);

      expect(result.socialAccountId).toBe('acc-real');
      expect(result.auth).toBe('real-token');
    });

    it('falls back to the first account when every account is a mock account', async () => {
      socialAccountRepository.findByBrandAndPlatform.mockResolvedValue([
        { id: 'acc-mock-1', accessToken: 'mock-token-1' },
        { id: 'acc-mock-2', accessToken: 'mock-token-2' }
      ]);

      const result = await socialAuthFactory.getAuthClient('brand-1', PLATFORMS.FACEBOOK);

      expect(result.socialAccountId).toBe('acc-mock-1');
    });

    it('throws when a caller-supplied socialAccountId belongs to a different brand', async () => {
      socialAccountRepository.findById.mockResolvedValue({ id: 'acc-1', brandId: 'brand-other', accessToken: 'tok' });

      await expect(socialAuthFactory.getAuthClient('brand-1', PLATFORMS.FACEBOOK, 'acc-1'))
        .rejects.toThrow('not found for brand');
    });

    it('throws when the caller-supplied socialAccountId does not exist', async () => {
      socialAccountRepository.findById.mockResolvedValue(null);

      await expect(socialAuthFactory.getAuthClient('brand-1', PLATFORMS.FACEBOOK, 'missing-acc'))
        .rejects.toThrow('not found for brand');
    });

    it('uses the specific account when a valid socialAccountId is supplied', async () => {
      socialAccountRepository.findById.mockResolvedValue({ id: 'acc-1', brandId: 'brand-1', accessToken: 'tok-1' });

      const result = await socialAuthFactory.getAuthClient('brand-1', PLATFORMS.FACEBOOK, 'acc-1');

      expect(result.socialAccountId).toBe('acc-1');
      expect(socialAccountRepository.findByBrandAndPlatform).not.toHaveBeenCalled();
    });
  });

  describe('Instagram auth client', () => {
    it('wraps the access token in an auth object', async () => {
      socialAccountRepository.findByBrandAndPlatform.mockResolvedValue([{ id: 'ig-1', accessToken: 'ig-token' }]);
      const result = await socialAuthFactory.getAuthClient('brand-1', PLATFORMS.INSTAGRAM);
      expect(result.auth).toEqual({ accessToken: 'ig-token' });
      expect(result.socialAccountId).toBe('ig-1');
    });
  });

  describe('TikTok auth client', () => {
    it('returns null when the only account is a mock account', async () => {
      socialAccountRepository.findByBrandAndPlatform.mockResolvedValue([{ id: 'tt-1', accessToken: 'mock-token' }]);
      const result = await socialAuthFactory.getAuthClient('brand-1', PLATFORMS.TIKTOK);
      expect(result).toBeNull();
    });

    it('refreshes the account via tiktok-analytics before returning', async () => {
      const tiktokAnalytics = require('../../src/services/social/tiktok/tiktok-analytics.service');
      socialAccountRepository.findByBrandAndPlatform.mockResolvedValue([{ id: 'tt-1', accessToken: 'real-token' }]);
      tiktokAnalytics.getOrRefreshAccount.mockResolvedValue({ id: 'tt-1', accessToken: 'refreshed-token' });

      const result = await socialAuthFactory.getAuthClient('brand-1', PLATFORMS.TIKTOK);

      expect(tiktokAnalytics.getOrRefreshAccount).toHaveBeenCalledWith({ id: 'tt-1', accessToken: 'real-token' });
      expect(result.auth).toBe('refreshed-token');
    });
  });

  describe('Bluesky auth client', () => {
    it('resolves an agent for the active account', async () => {
      const blueskyService = require('../../src/services/social/bluesky/bluesky.service');
      socialAccountRepository.findByBrandAndPlatform.mockResolvedValue([{ id: 'bs-1', accessToken: 'bs-token' }]);
      blueskyService.getAgentForAccount.mockResolvedValue({ agentId: 'fake-agent' });

      const result = await socialAuthFactory.getAuthClient('brand-1', PLATFORMS.BLUESKY);

      expect(result.auth.agent).toEqual({ agentId: 'fake-agent' });
      expect(result.socialAccountId).toBe('bs-1');
    });
  });

  describe('YouTube auth client', () => {
    it('returns null when the active account has a mock access token', async () => {
      socialAccountRepository.findByBrandAndPlatform.mockResolvedValue([{ id: 'yt-1', accessToken: 'mock-token', platformAccountId: 'chan-1' }]);
      const result = await socialAuthFactory.getAuthClient('brand-1', PLATFORMS.YOUTUBE);
      expect(result).toBeNull();
    });

    it('builds an authenticated client that persists refreshed tokens', async () => {
      const googleOAuthService = require('../../src/services/social/google-oauth.service');
      let tokenListener;
      const fakeClient = {
        setCredentials: jest.fn(),
        on: jest.fn((event, cb) => { tokenListener = cb; })
      };
      googleOAuthService.createClient.mockReturnValue(fakeClient);
      socialAccountRepository.findByBrandAndPlatform.mockResolvedValue([
        { id: 'yt-1', accessToken: 'real-token', refreshToken: 'refresh-1', platformAccountId: 'chan-1', tokenExpiresAt: new Date() }
      ]);

      const result = await socialAuthFactory.getAuthClient('brand-1', PLATFORMS.YOUTUBE);

      expect(result.socialAccountId).toBe('yt-1');
      expect(fakeClient.setCredentials).toHaveBeenCalled();

      await tokenListener({ refresh_token: 'new-refresh' });
      expect(socialAccountRepository.updateTokens).toHaveBeenCalledWith('yt-1', { refresh_token: 'new-refresh' });
    });

    it('preserves the existing refresh token when Google issues an access-token-only refresh', async () => {
      const googleOAuthService = require('../../src/services/social/google-oauth.service');
      let tokenListener;
      const fakeClient = {
        setCredentials: jest.fn(),
        on: jest.fn((event, cb) => { tokenListener = cb; })
      };
      googleOAuthService.createClient.mockReturnValue(fakeClient);
      socialAccountRepository.findByBrandAndPlatform.mockResolvedValue([
        { id: 'yt-1', accessToken: 'real-token', refreshToken: 'existing-refresh', platformAccountId: 'chan-1' }
      ]);

      await socialAuthFactory.getAuthClient('brand-1', PLATFORMS.YOUTUBE);
      await tokenListener({ access_token: 'new-access' });

      expect(socialAccountRepository.updateTokens).toHaveBeenCalledWith('yt-1', {
        access_token: 'new-access',
        refresh_token: 'existing-refresh'
      });
    });
  });
});
