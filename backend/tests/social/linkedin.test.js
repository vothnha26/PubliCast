const linkedinService = require('../../src/services/social/linkedin');
const linkedinGateway = require('../../src/services/social/linkedin/linkedin.gateway');
const socialAccountRepository = require('../../src/repositories/social/social-account.repository');
const LinkedInPublishStrategyFactory = require('../../src/services/social/linkedin/publish-strategies/publish-strategy.factory');
const TextPublishStrategy = require('../../src/services/social/linkedin/publish-strategies/text.strategy');
const ImagePublishStrategy = require('../../src/services/social/linkedin/publish-strategies/image.strategy');
const VideoPublishStrategy = require('../../src/services/social/linkedin/publish-strategies/video.strategy');

jest.mock('../../src/repositories/social/social-account.repository');

// Mock fetch globally
global.fetch = jest.fn();

describe('LinkedIn Integration Service & Gateway Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================
  // 1. GATEWAY LAYER TESTS
  // ==========================================
  describe('LinkedInGateway', () => {
    describe('getAuthUrl', () => {
      it('should generate a valid OAuth 2.0 URL', () => {
        const url = linkedinGateway.getAuthUrl('state_123', 'http://redirect.uri');
        expect(url).toContain('https://www.linkedin.com/oauth/v2/authorization');
        expect(url).toContain('client_id=mock_linkedin_client_id');
        expect(url).toContain('redirect_uri=' + encodeURIComponent('http://redirect.uri'));
        expect(url).toContain('state=state_123');
        expect(url).toContain('scope=' + encodeURIComponent('w_member_social profile openid email'));
      });
    });

    describe('exchangeCodeForToken', () => {
      it('should return mock token if code starts with mock-', async () => {
        const result = await linkedinGateway.exchangeCodeForToken('mock-code-123', 'http://redirect.uri');
        expect(result.access_token).toContain('mock-linkedin-token-');
        expect(result.expires_in).toBe(5184000);
      });

      it('should exchange code via fetch if code is real', async () => {
        const mockResponseData = { access_token: 'real_token_123', expires_in: 3600 };
        global.fetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponseData
        });

        const result = await linkedinGateway.exchangeCodeForToken('real-code-123', 'http://redirect.uri');
        expect(global.fetch).toHaveBeenCalledWith(
          'https://www.linkedin.com/oauth/v2/accessToken',
          expect.objectContaining({
            method: 'POST',
            body: expect.any(URLSearchParams)
          })
        );
        expect(result.access_token).toBe('real_token_123');
      });

      it('should throw error if fetch token exchange fails', async () => {
        global.fetch.mockResolvedValueOnce({
          ok: false,
          json: async () => ({ error_description: 'Invalid authorization code' })
        });

        await expect(
          linkedinGateway.exchangeCodeForToken('real-code-invalid', 'http://redirect.uri')
        ).rejects.toThrow('Invalid authorization code');
      });
    });

    describe('getMemberProfile', () => {
      it('should return mock profile if accessToken starts with mock-', async () => {
        const profile = await linkedinGateway.getMemberProfile('mock-token');
        expect(profile.id).toBe('mock-linkedin-id-123');
        expect(profile.displayName).toBe('Mock LinkedIn User');
        expect(profile.followersCount).toBe(1250);
      });

      it('should fetch profile from OpenID endpoint for real token', async () => {
        const mockUserInfo = { sub: 'real-user-id', name: 'Real User', picture: 'http://pic.jpg' };
        global.fetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockUserInfo
        });

        const profile = await linkedinGateway.getMemberProfile('real-token-xyz');
        expect(global.fetch).toHaveBeenCalledWith('https://api.linkedin.com/v2/userinfo', {
          headers: { Authorization: 'Bearer real-token-xyz' }
        });
        expect(profile.id).toBe('real-user-id');
        expect(profile.displayName).toBe('Real User');
        expect(profile.profilePictureUrl).toBe('http://pic.jpg');
      });

      it('should throw error if fetch profile fails', async () => {
        global.fetch.mockResolvedValueOnce({
          ok: false,
          json: async () => ({ message: 'Token expired' })
        });

        await expect(
          linkedinGateway.getMemberProfile('real-token-expired')
        ).rejects.toThrow('Token expired');
      });
    });

    describe('createPost', () => {
      it('should return mock post URN if accessToken starts with mock-', async () => {
        const result = await linkedinGateway.createPost('mock-token', 'member_123', { caption: 'Hello' });
        expect(result.id).toContain('mock-linkedin-urn-share-');
      });

      it('should post text content to /posts endpoint for real token', async () => {
        const mockHeaders = new Map();
        mockHeaders.set('x-restli-id', 'urn:li:share:999');
        global.fetch.mockResolvedValueOnce({
          ok: true,
          headers: mockHeaders,
          json: async () => ({ id: 'urn:li:share:999' })
        });

        const result = await linkedinGateway.createPost('real-token-xyz', 'member_123', {
          caption: 'Hello LinkedIn world!'
        });

        expect(global.fetch).toHaveBeenCalledWith(
          'https://api.linkedin.com/v2/posts',
          expect.objectContaining({
            method: 'POST',
            headers: {
              'Authorization': 'Bearer real-token-xyz',
              'Content-Type': 'application/json',
              'LinkedIn-Version': '202306'
            },
            body: expect.stringContaining('"commentary":"Hello LinkedIn world!"')
          })
        );
        expect(result.id).toBe('urn:li:share:999');
      });

      // Regression test for #94 (part B): media posting previously attached
      // a hardcoded placeholder asset URN instead of actually registering/
      // uploading the media. Real Assets API upload isn't implemented, so
      // it must now fail loudly rather than silently post with a fake asset.
      it('throws for mediaUrl posts instead of attaching the fake placeholder asset (#94)', async () => {
        await expect(linkedinGateway.createPost('real-token-xyz', 'member_123', {
          caption: 'Look at this image!',
          mediaUrl: 'http://example.com/image.png',
          title: 'Gorgeous view'
        })).rejects.toThrow('LinkedIn media posting is not yet implemented');

        expect(global.fetch).not.toHaveBeenCalled();
      });

      // Regression test for #94 (part A): a 2xx response missing BOTH the
      // x-restli-id header and body.id previously fell back to a
      // synthesized `urn:li:share:${Date.now()}`, marking the post
      // PUBLISHED with an id LinkedIn never issued.
      it('throws when the response is missing both x-restli-id and body.id', async () => {
        const mockHeaders = new Map(); // no x-restli-id
        global.fetch.mockResolvedValueOnce({
          ok: true,
          headers: mockHeaders,
          json: async () => ({}) // no id
        });

        await expect(linkedinGateway.createPost('real-token-xyz', 'member_123', {
          caption: 'Text-only post'
        })).rejects.toThrow('LinkedIn publish response missing share id');
      });
    });
  });

  // ==========================================
  // 2. STRATEGY LAYER TESTS
  // ==========================================
  describe('LinkedInPublishStrategyFactory & Strategies', () => {
    describe('Strategy Selection', () => {
      it('should return TextPublishStrategy when no mediaUrl is provided', () => {
        const strategy = LinkedInPublishStrategyFactory.getStrategy(null);
        expect(strategy).toBeInstanceOf(TextPublishStrategy);
      });

      it('should return ImagePublishStrategy when mediaUrl is an image', () => {
        const strategy = LinkedInPublishStrategyFactory.getStrategy('https://site.com/image.jpg');
        expect(strategy).toBeInstanceOf(ImagePublishStrategy);
      });

      it('should return VideoPublishStrategy when mediaUrl is a video file', () => {
        const strategy = LinkedInPublishStrategyFactory.getStrategy('https://site.com/video.mp4');
        expect(strategy).toBeInstanceOf(VideoPublishStrategy);
      });
    });

    describe('Strategy execution', () => {
      let createPostSpy;

      beforeEach(() => {
        createPostSpy = jest.spyOn(linkedinGateway, 'createPost').mockResolvedValue({ id: 'urn:li:share:777' });
      });

      afterEach(() => {
        createPostSpy.mockRestore();
      });

      it('should call gateway with text parameters', async () => {
        const strategy = new TextPublishStrategy();
        await strategy.publish('member_123', 'mock-token', { caption: 'Text only' });
        expect(createPostSpy).toHaveBeenCalledWith('mock-token', 'member_123', { caption: 'Text only' });
      });

      it('should call gateway with image parameters', async () => {
        const strategy = new ImagePublishStrategy();
        await strategy.publish('member_123', 'mock-token', {
          caption: 'Awesome image',
          mediaUrl: 'http://site.com/img.jpg'
        });
        expect(createPostSpy).toHaveBeenCalledWith('mock-token', 'member_123', {
          caption: 'Awesome image',
          mediaUrl: 'http://site.com/img.jpg',
          title: 'Image Post'
        });
      });

      it('should call gateway with video parameters', async () => {
        const strategy = new VideoPublishStrategy();
        await strategy.publish('member_123', 'mock-token', {
          caption: 'Awesome video',
          mediaUrl: 'http://site.com/vid.mp4',
          title: 'Custom Title'
        });
        expect(createPostSpy).toHaveBeenCalledWith('mock-token', 'member_123', {
          caption: 'Awesome video',
          mediaUrl: 'http://site.com/vid.mp4',
          title: 'Custom Title'
        });
      });
    });
  });

  // ==========================================
  // 3. SERVICE FACADE LAYER TESTS
  // ==========================================
  describe('LinkedInService Facade', () => {
    describe('getAnalyticsReport', () => {
      it('should generate structured LinkedIn metrics matching the design spec', async () => {
        const startDate = '2026-05-01';
        const endDate = '2026-05-15';
        const currentFollowers = 1250;

        const result = await linkedinService.getAnalyticsReport({ accessToken: 'mock_token' }, startDate, endDate, currentFollowers);

        expect(result).toBeDefined();
        expect(result.summary).toBeDefined();
        expect(result.summary.followers).toBe(currentFollowers);
        expect(result.growth.length).toBeGreaterThan(0);
        expect(result.balance.length).toBeGreaterThan(0);
        expect(result.clicks).toBeDefined();
        expect(result.interactions.likes).toBeDefined();
      });

      // Regression test for #69: getAnalyticsReport previously always
      // returned mock data with zero signal it wasn't real, and
      // interactions.viewsBreakdown was a fabricated organic/promoted split
      // with no real data source backing it.
      it('flags the response as isMock (no real LinkedIn analytics API integrated yet) and does not fabricate a viewsBreakdown split (#69)', async () => {
        const result = await linkedinService.getAnalyticsReport({ accessToken: 'mock_token' }, '2026-05-01', '2026-05-15', 1250);

        expect(result.isMock).toBe(true);
        expect(result.interactions.viewsBreakdown).toBeUndefined();
      });
    });

    describe('syncChannelMetrics', () => {
      it('should query the repository, generate mock data, and call upsertLinkedInAccount', async () => {
        const mockAccount = {
          id: 'sa_linkedin_1',
          brandId: 'brand_123',
          platform: 'LINKEDIN',
          platformAccountId: 'mock-linkedin-id-123',
          username: 'linkedin_test_user',
          displayName: 'LinkedIn Test User',
          profilePictureUrl: 'http://pic.jpg/avatar',
          accessToken: 'mock_access_token',
          refreshToken: 'mock_refresh_token',
          tokenExpiresAt: new Date(Date.now() + 3600 * 1000)
        };

        const getMemberProfileSpy = jest.spyOn(linkedinGateway, 'getMemberProfile').mockResolvedValue({
          id: 'mock-linkedin-id-123',
          displayName: 'LinkedIn Test User',
          profilePictureUrl: 'http://pic.jpg/avatar',
          followersCount: 1250,
          connectionsCount: 450,
          industry: 'Technology'
        });

        socialAccountRepository.findById.mockResolvedValue(mockAccount);
        socialAccountRepository.upsertLinkedInAccount.mockResolvedValue({ id: 'sa_linkedin_1' });

        const result = await linkedinService.syncChannelMetrics('sa_linkedin_1', '2026-05-01', '2026-05-15');

        expect(socialAccountRepository.findById).toHaveBeenCalledWith('sa_linkedin_1');
        expect(getMemberProfileSpy).toHaveBeenCalledWith('mock_access_token');
        expect(socialAccountRepository.upsertLinkedInAccount).toHaveBeenCalledWith(
          'brand_123',
          expect.objectContaining({
            pageId: 'mock-linkedin-id-123',
            displayName: 'LinkedIn Test User',
            analytics: expect.any(Object)
          }),
          expect.any(Object),
          // enqueueSync: false — syncChannelMetrics IS the sync job; it must not
          // re-enqueue another one via the outbox or it loops forever.
          { enqueueSync: false }
        );
        expect(result.id).toBe('sa_linkedin_1');

        getMemberProfileSpy.mockRestore();
      });
    });

    describe('publishPost', () => {
      it('should publish post via strategic pipeline', async () => {
        const mockAccounts = [{
          id: 'sa_linkedin_1',
          brandId: 'brand_123',
          platform: 'LINKEDIN',
          platformAccountId: 'mock-linkedin-id-123',
          accessToken: 'token_for_strategy'
        }];

        const createPostSpy = jest.spyOn(linkedinGateway, 'createPost').mockResolvedValue({ id: 'urn:li:share:123' });
        socialAccountRepository.findByBrandAndPlatform.mockResolvedValue(mockAccounts);

        const postData = {
          caption: 'Hello LinkedIn world!',
          mediaUrls: ['http://site.com/img.jpg']
        };

        const result = await linkedinService.publishPost('brand_123', postData);

        expect(socialAccountRepository.findByBrandAndPlatform).toHaveBeenCalledWith('brand_123', 'LINKEDIN');
        expect(createPostSpy).toHaveBeenCalledWith(
          'token_for_strategy',
          'mock-linkedin-id-123',
          expect.objectContaining({
            caption: 'Hello LinkedIn world!',
            mediaUrl: 'http://site.com/img.jpg'
          })
        );
        expect(result.platformVideoId).toBe('urn:li:share:123');
        expect(result.publishedAt).toBeDefined();

        createPostSpy.mockRestore();
      });

      it('should throw error if brand has no connected linkedin account', async () => {
        socialAccountRepository.findByBrandAndPlatform.mockResolvedValue([]);

        await expect(
          linkedinService.publishPost('brand_123', { caption: 'Hi' })
        ).rejects.toThrow('LinkedIn account not connected for this brand');
      });
    });
  });
});
