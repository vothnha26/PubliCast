// @atproto/api is globally mocked in jest.setup.cjs (its dependency tree
// ships ESM-only packages Jest can't load).
const blueskyGateway = require('../../src/services/social/bluesky/bluesky.gateway');
const blueskyOAuthHelper = require('../../src/services/social/bluesky/bluesky-oauth.helper');
const blueskyService = require('../../src/services/social/bluesky/bluesky.service');
const socialAccountRepository = require('../../src/repositories/social/social-account.repository');

jest.mock('../../src/services/social/bluesky/bluesky.gateway');
jest.mock('../../src/services/social/bluesky/bluesky-oauth.helper');
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

    it('should export DEFAULT_LANGS as ["vi"]', () => {
      const BLUESKY_CONSTANTS = require('../../src/services/social/bluesky/bluesky.constants');
      expect(BLUESKY_CONSTANTS.DEFAULT_LANGS).toEqual(['vi']);
    });
  });

  describe('Bluesky Service Facade', () => {
    it('should connect a bluesky channel via OAuth DPoP and upsert into repository', async () => {
      const mockAgent = {};
      const mockKeyPair = {
        privateKey: { export: jest.fn(() => 'mock-private-key-pem') },
        jwk: { kty: 'EC', crv: 'P-256', x: 'x', y: 'y' }
      };
      const mockProfile = { did: 'did:plc:123', handle: 'user.bsky.social', displayName: 'Test User', avatar: 'http://example.com/avatar.jpg', followersCount: 100, followsCount: 50, postsCount: 10 };

      blueskyOAuthHelper.resolveDidToPdsUrl.mockResolvedValue('https://puffball.us-east.host.bsky.network');
      blueskyGateway.createDPoPAgent.mockReturnValue(mockAgent);
      blueskyGateway.getProfile.mockResolvedValue(mockProfile);

      socialAccountRepository.upsertBlueskyAccount.mockResolvedValue({
        id: 'sa_bsky_1',
        platform: 'BLUESKY',
        displayName: 'Test User',
        username: 'user.bsky.social'
      });

      const tokenData = { access_token: 'access_123', refresh_token: 'refresh_123', sub: 'did:plc:123' };
      const account = await blueskyService.connectChannelViaOAuth('brand_1', { tokenData, keyPair: mockKeyPair });

      expect(blueskyOAuthHelper.resolveDidToPdsUrl).toHaveBeenCalledWith('did:plc:123');
      expect(blueskyGateway.createDPoPAgent).toHaveBeenCalledWith({ did: 'did:plc:123', accessJwt: 'access_123', keyPair: mockKeyPair, pdsUrl: 'https://puffball.us-east.host.bsky.network' });
      expect(socialAccountRepository.upsertBlueskyAccount).toHaveBeenCalled();
      expect(account.username).toBe('user.bsky.social');
    });

    it('should throw when OAuth token exchange did not return an access token or DID', async () => {
      await expect(
        blueskyService.connectChannelViaOAuth('brand_1', { tokenData: {}, keyPair: {} })
      ).rejects.toThrow('Bluesky OAuth token exchange did not return an access token/DID');
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
