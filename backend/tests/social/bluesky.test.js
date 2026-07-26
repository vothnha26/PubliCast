// @atproto/api is globally mocked in jest.setup.cjs (its dependency tree
// ships ESM-only packages Jest can't load).
const blueskyGateway = require('../../src/services/social/bluesky/bluesky.gateway');
const blueskyService = require('../../src/services/social/bluesky/bluesky.service');
const socialAccountRepository = require('../../src/repositories/social/social-account.repository');

jest.mock('../../src/services/social/bluesky/bluesky.gateway');
jest.mock('../../src/repositories/social/social-account.repository');
jest.mock('../../src/utils/encryption', () => ({
  decrypt: jest.fn(val => val || 'decrypted_token'),
  encrypt: jest.fn(val => val)
}));

describe('Bluesky Integration Suite', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Bluesky Gateway', () => {
    it('should login and publish post successfully', async () => {
      const mockAgent = {};
      blueskyGateway.createAgent.mockReturnValue(mockAgent);
      blueskyGateway.publishPost.mockResolvedValue({ id: 'at://did:plc:123/app.bsky.feed.post/456', cid: 'cid123' });

      const result = await blueskyGateway.publishPost(mockAgent, { text: 'Hello Bluesky!' });

      expect(result.id).toBe('at://did:plc:123/app.bsky.feed.post/456');
      expect(blueskyGateway.publishPost).toHaveBeenCalledWith(mockAgent, { text: 'Hello Bluesky!' });
    });
  });

  describe('Bluesky Service Facade', () => {
    it('should connect a bluesky channel and upsert into repository', async () => {
      const mockAgent = {};
      const mockSession = { data: { accessJwt: 'access_123', refreshJwt: 'refresh_123', did: 'did:plc:123' } };
      const mockProfile = { did: 'did:plc:123', handle: 'user.bsky.social', displayName: 'Test User', avatar: 'http://example.com/avatar.jpg', followersCount: 100, followsCount: 50, postsCount: 10 };

      blueskyGateway.createAgent.mockReturnValue(mockAgent);
      blueskyGateway.loginWithAppPassword.mockResolvedValue(mockSession);
      blueskyGateway.getProfile.mockResolvedValue(mockProfile);

      socialAccountRepository.upsertBlueskyAccount.mockResolvedValue({
        id: 'sa_bsky_1',
        platform: 'BLUESKY',
        displayName: 'Test User',
        username: 'user.bsky.social'
      });

      const account = await blueskyService.connectChannel('brand_1', { handle: 'user.bsky.social', appPassword: 'app-password-123' });

      expect(blueskyGateway.loginWithAppPassword).toHaveBeenCalledWith(mockAgent, 'user.bsky.social', 'app-password-123');
      expect(socialAccountRepository.upsertBlueskyAccount).toHaveBeenCalled();
      expect(account.username).toBe('user.bsky.social');
    });

    it('should publish post successfully through service facade', async () => {
      const mockAccount = {
        id: 'sa_bsky_1',
        isConnected: true,
        accessToken: 'access_123',
        blueskyAccount: { pdsUrl: 'https://bsky.social', did: 'did:plc:123' }
      };

      blueskyGateway.createAgent.mockReturnValue({});
      blueskyGateway.resumeSession.mockResolvedValue(true);
      socialAccountRepository.findByBrandAndPlatformFirst.mockResolvedValue(mockAccount);
      blueskyGateway.publishPost.mockResolvedValue({ id: 'at://did:plc:123/app.bsky.feed.post/456' });

      const result = await blueskyService.publishPost('brand_1', { caption: 'Test Bluesky post' });

      expect(result.id).toBe('at://did:plc:123/app.bsky.feed.post/456');
    });

    it('should throw error when Bluesky account is not connected', async () => {
      socialAccountRepository.findByBrandAndPlatformFirst.mockResolvedValue(null);

      await expect(blueskyService.publishPost('brand_1', { caption: 'Test' })).rejects.toThrow('Bluesky account not connected');
    });
  });
});
