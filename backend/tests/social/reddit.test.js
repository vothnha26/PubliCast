const redditGateway = require('../../src/services/social/reddit/reddit.gateway');
const redditService = require('../../src/services/social/reddit/reddit.service');
const { RedditPublishStrategyFactory, SelfPostStrategy, LinkPostStrategy, ImagePostStrategy, VideoPostStrategy } = require('../../src/services/social/reddit/strategies/reddit-publish.strategy');
const socialAccountRepository = require('../../src/repositories/social/social-account.repository');

jest.mock('../../src/services/social/reddit/reddit.gateway');
jest.mock('../../src/repositories/social/social-account.repository');

describe('Reddit API Integration Suite', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Reddit Gateway & Auth', () => {
    it('should generate authorization URL with correct scopes and parameters', () => {
      const actualGateway = jest.requireActual('../../src/services/social/reddit/reddit.gateway');
      const url = actualGateway.getAuthUrl('test_state', 'http://localhost/callback');

      expect(url).toContain('https://www.reddit.com/api/v1/authorize');
      expect(url).toContain('response_type=code');
      expect(url).toContain('duration=permanent');
      expect(url).toContain('scope=identity+submit+read+history+flair');
      expect(url).toContain('state=test_state');
    });
  });

  describe('Reddit Strategy Pattern', () => {
    it('should return SelfPostStrategy for plain text posts', () => {
      const strategy = RedditPublishStrategyFactory.getStrategy({ caption: 'Hello Reddit' });
      expect(strategy).toBeInstanceOf(SelfPostStrategy);
    });

    it('should return LinkPostStrategy for post with linkUrl', () => {
      const strategy = RedditPublishStrategyFactory.getStrategy({ caption: 'Link post', linkUrl: 'https://example.com' });
      expect(strategy).toBeInstanceOf(LinkPostStrategy);
    });

    it('should return ImagePostStrategy for post with image media', () => {
      const strategy = RedditPublishStrategyFactory.getStrategy({ caption: 'Photo', images: [{ buffer: Buffer.from('img') }] });
      expect(strategy).toBeInstanceOf(ImagePostStrategy);
    });

    it('should return VideoPostStrategy for post with video media', () => {
      const strategy = RedditPublishStrategyFactory.getStrategy({ caption: 'Video', video: { buffer: Buffer.from('vid') } });
      expect(strategy).toBeInstanceOf(VideoPostStrategy);
    });
  });

  describe('Reddit Service Facade', () => {
    it('should connect a Reddit account and upsert into repository', async () => {
      const mockTokens = { accessToken: 'acc_123', refreshToken: 'ref_123', expiresIn: 3600, scope: 'identity submit' };
      const mockClient = {};
      const mockMe = { id: 'user_123', username: 'RedditUser', displayName: 'RedditUser', linkKarma: 100, commentKarma: 50, iconImg: 'http://icon.png' };

      redditGateway.exchangeCode.mockResolvedValue(mockTokens);
      redditGateway.createClient.mockReturnValue(mockClient);
      redditGateway.getMe.mockResolvedValue(mockMe);

      socialAccountRepository.upsertRedditAccount.mockResolvedValue({
        id: 'sa_reddit_1',
        platform: 'REDDIT',
        username: 'RedditUser'
      });

      const account = await redditService.connectChannel('brand_1', 'auth_code_123');

      expect(redditGateway.exchangeCode).toHaveBeenCalledWith('auth_code_123', undefined);
      expect(redditGateway.getMe).toHaveBeenCalledWith(mockClient);
      expect(socialAccountRepository.upsertRedditAccount).toHaveBeenCalled();
      expect(account.username).toBe('RedditUser');
    });

    it('should publish post to subreddit using Reddit Service', async () => {
      const mockAccount = {
        id: 'sa_reddit_1',
        accessToken: 'token_123',
        redditAccount: { username: 'RedditUser' }
      };
      const mockClient = {};

      socialAccountRepository.findByBrandAndPlatformFirst.mockResolvedValue(mockAccount);
      redditGateway.createClient.mockReturnValue(mockClient);
      redditGateway.submitPost.mockResolvedValue({ id: 't3_abc123', url: 'https://reddit.com/r/technology/comments/abc123' });

      const result = await redditService.publishPost('brand_1', {
        title: 'Tech News',
        caption: 'Latest tech updates',
        metadata: { subreddit: 'technology', isNsfw: false }
      });

      expect(socialAccountRepository.findByBrandAndPlatformFirst).toHaveBeenCalledWith('brand_1', 'REDDIT');
      expect(redditGateway.submitPost).toHaveBeenCalledWith(mockClient, expect.objectContaining({
        subreddit: 'technology',
        title: 'Tech News',
        kind: 'self'
      }));
      expect(result.id).toBe('t3_abc123');
    });

    it('should throw error if Reddit account is not connected when publishing', async () => {
      socialAccountRepository.findByBrandAndPlatformFirst.mockResolvedValue(null);

      await expect(redditService.publishPost('brand_1', {
        title: 'Test',
        metadata: { subreddit: 'test' }
      })).rejects.toThrow('Reddit account not connected for this brand');
    });

    it('should throw error if target subreddit is not specified', async () => {
      const mockAccount = { id: 'sa_reddit_1', accessToken: 'token_123' };
      socialAccountRepository.findByBrandAndPlatformFirst.mockResolvedValue(mockAccount);

      await expect(redditService.publishPost('brand_1', {
        title: 'Test',
        metadata: {}
      })).rejects.toThrow('Target subreddit is required for Reddit post');
    });
  });
});
