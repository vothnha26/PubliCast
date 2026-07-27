const facebookService = require('../../src/services/social/facebook');
const facebookGateway = require('../../src/services/social/facebook/facebook.gateway');
const socialAccountRepository = require('../../src/repositories/social/social-account.repository');
const facebookAnalyticsService = require('../../src/services/social/facebook/facebook-analytics.service');

jest.mock('../../src/services/social/facebook/facebook.gateway');
jest.mock('../../src/repositories/social/social-account.repository');
jest.mock('../../src/services/social/connection-conflict.guard', () => ({
  ConnectionConflictGuard: {
    validateConflict: jest.fn().mockResolvedValue({ conflict: false })
  },
  ConnectionConflictError: class ConnectionConflictError extends Error {}
}));

describe('Facebook Integration Service Tests', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('FacebookGateway', () => {
    it('should exchange code for User Access Token', async () => {
      const mockResponse = { access_token: 'user_token_123' };
      facebookGateway.exchangeCodeForToken.mockResolvedValue(mockResponse);

      const result = await facebookGateway.exchangeCodeForToken('code_123', 'http://redirect.uri');

      expect(facebookGateway.exchangeCodeForToken).toHaveBeenCalledWith('code_123', 'http://redirect.uri');
      expect(result.access_token).toBe('user_token_123');
    });

    it('should fetch page accounts', async () => {
      const mockAccounts = [
        {
          id: 'page_123',
          name: 'My Cool Facebook Page',
          access_token: 'page_token_123',
          picture: { data: { url: 'http://pic.jpg' } }
        }
      ];
      facebookGateway.getUserPages.mockResolvedValue(mockAccounts);

      const result = await facebookGateway.getUserPages('user_token_123');

      expect(facebookGateway.getUserPages).toHaveBeenCalledWith('user_token_123');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('page_123');
    });
  });

  describe('FacebookAnalyticsService', () => {
    it('should fetch insights and generate complete analytics package', async () => {
      const mockPageDetails = {
        pageId: 'page_id_123',
        displayName: 'My Cool Page',
        followersCount: 500,
        likesCount: 480
      };

      const mockInsights = [
        {
          name: 'page_views_total',
          values: [
            { value: 10, end_time: '2026-05-24T07:00:00+0000' }
          ]
        },
        {
          name: 'page_daily_follows_unique',
          values: [
            { value: 5, end_time: '2026-05-24T07:00:00+0000' }
          ]
        },
        {
          name: 'page_post_engagements',
          values: [
            { value: 15, end_time: '2026-05-24T07:00:00+0000' }
          ]
        }
      ];

      const mockFeed = [
        {
          id: 'post_1',
          created_time: '2026-05-24T12:00:00+0000',
          message: 'Hello world',
          reactions: { summary: { total_count: 5 } },
          comments: { summary: { total_count: 2 } },
          shares: { count: 1 }
        }
      ];

      facebookGateway.getPageDetails.mockResolvedValue(mockPageDetails);
      facebookGateway.getPageInsights.mockResolvedValue(mockInsights);
      facebookGateway.getPageFeed.mockResolvedValue({ data: mockFeed });

      const result = await facebookAnalyticsService.getAnalyticsReport('page_id_123', 'page_token_123', '2026-05-20', '2026-05-25', 500);

      expect(result).toBeDefined();
      expect(result.summary.followers).toBe(500);
      expect(result.summary.pageVisits).toBe(10); // page_views_total = 10
      expect(result.summary.averageDailyNewFollowers).toBeGreaterThan(0);
      
      // Verification of date subtraction logic: 
      // end_time '2026-05-24T07:00:00+0000' minus 24h should map to '2026-05-23'
      const dataPoint = result.growth.find(d => d.date === '2026-05-23');
      expect(dataPoint).toBeDefined();
      expect(dataPoint.pageVisits).toBe(10); // Mapped from page_views_total
      
      expect(result.growth).toBeDefined();
      expect(result.balance).toBeDefined();
    });

    // Regression test for #69: interactions.viewsBreakdown was a fabricated
    // organic/promoted split (hardcoded 70/30) with no backing API call.
    it('does not include a fabricated viewsBreakdown split (#69)', async () => {
      facebookGateway.getPageDetails.mockResolvedValue({
        pageId: 'page_id_123', displayName: 'My Cool Page', followersCount: 500, likesCount: 480
      });
      facebookGateway.getPageInsights.mockResolvedValue([]);
      facebookGateway.getPageFeed.mockResolvedValue({ data: [] });

      const result = await facebookAnalyticsService.getAnalyticsReport('page_id_123', 'page_token_123', '2026-05-20', '2026-05-25', 500);

      expect(result.interactions.viewsBreakdown).toBeUndefined();
    });
  });

  describe('FacebookService Facade', () => {
    it('should execute connectChannel and call repository upsertFacebookAccount', async () => {
      const mockUserToken = { access_token: 'user_token' };
      const mockPages = [
        {
          id: 'page_123',
          name: 'Brand Page',
          access_token: 'page_token',
          picture: { data: { url: 'http://avatar.jpg' } }
        }
      ];

      const mockPageDetails = {
        pageId: 'page_123',
        displayName: 'Brand Page',
        followersCount: 500,
        likesCount: 480,
        profilePictureUrl: 'http://avatar.jpg'
      };

      facebookGateway.exchangeCodeForToken.mockResolvedValue(mockUserToken);
      facebookGateway.getUserPages.mockResolvedValue(mockPages);
      facebookGateway.getUserPermissions.mockResolvedValue([]);
      facebookGateway.getPageDetails.mockResolvedValue(mockPageDetails);
      facebookGateway.getPageInsights.mockResolvedValue([]);
      facebookGateway.getPageFeed.mockResolvedValue({ data: [] });
      
      socialAccountRepository.upsertFacebookAccount.mockResolvedValue({ id: 'sa_fb_1' });

      const result = await facebookService.connectChannel('brand_1', 'auth_code', 'http://redirect.uri');

      expect(facebookGateway.exchangeCodeForToken).toHaveBeenCalledWith('auth_code', 'http://redirect.uri');
      expect(facebookGateway.getUserPages).toHaveBeenCalledWith('user_token');
      expect(socialAccountRepository.upsertFacebookAccount).toHaveBeenCalledWith(
        'brand_1',
        expect.objectContaining({
          pageId: 'page_123',
          displayName: 'Brand Page',
          profilePictureUrl: 'http://avatar.jpg'
        }),
        expect.any(Object)
      );
      expect(result.id).toBe('sa_fb_1');
    });
  });
});
