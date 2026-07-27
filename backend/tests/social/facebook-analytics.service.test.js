jest.mock('../../src/services/social/facebook/facebook.gateway');
jest.mock('../../src/repositories/social/social-account.repository', () => ({
  findAnalyticsInRange: jest.fn().mockResolvedValue([])
}));

const facebookGateway = require('../../src/services/social/facebook/facebook.gateway');
const facebookAnalyticsService = require('../../src/services/social/facebook/facebook-analytics.service');

const PAGE_ID = 'page-1';
const TOKEN = 'real-page-token';

function makePost(id, createdTime) {
  return {
    id,
    created_time: createdTime,
    comments: { summary: { total_count: 1 } },
    reactions: { summary: { total_count: 2 } },
    shares: { count: 0 }
  };
}

describe('FacebookAnalyticsService (#70)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    facebookGateway.getPageInsights.mockResolvedValue([]);
    facebookGateway.getPageStories.mockResolvedValue([]);
  });

  describe('getPageFeed pagination', () => {
    it('follows nextPageToken across multiple pages instead of only fetching the first one', async () => {
      const startDate = '2026-01-01';
      const endDate = '2026-01-10';

      facebookGateway.getPageFeed
        .mockResolvedValueOnce({
          data: [makePost('p1', '2026-01-09T00:00:00Z')],
          nextPageToken: 'cursor-2'
        })
        .mockResolvedValueOnce({
          data: [makePost('p2', '2026-01-05T00:00:00Z')],
          nextPageToken: null
        });

      const result = await facebookAnalyticsService.getAnalyticsReport(PAGE_ID, TOKEN, startDate, endDate, 100);

      expect(facebookGateway.getPageFeed).toHaveBeenCalledTimes(2);
      expect(facebookGateway.getPageFeed).toHaveBeenNthCalledWith(1, PAGE_ID, TOKEN, null, 100);
      expect(facebookGateway.getPageFeed).toHaveBeenNthCalledWith(2, PAGE_ID, TOKEN, 'cursor-2', 100);
      expect(result.summary.totalContent).toBe(2);
    });

    it('stops paginating once a page is entirely older than the requested range', async () => {
      const startDate = '2026-01-05';
      const endDate = '2026-01-10';

      facebookGateway.getPageFeed.mockResolvedValueOnce({
        // Oldest post in this page (last element) is before startDate
        data: [makePost('p1', '2026-01-09T00:00:00Z'), makePost('p2', '2026-01-01T00:00:00Z')],
        nextPageToken: 'cursor-2'
      });

      await facebookAnalyticsService.getAnalyticsReport(PAGE_ID, TOKEN, startDate, endDate, 100);

      // Must not follow cursor-2 since the last post in page 1 is already before the range
      expect(facebookGateway.getPageFeed).toHaveBeenCalledTimes(1);
    });

    it('never calls the gateway more than the safety cap even if nextPageToken never runs out', async () => {
      facebookGateway.getPageFeed.mockImplementation(() => Promise.resolve({
        data: [makePost('p', '2026-01-09T00:00:00Z')],
        nextPageToken: 'always-more'
      }));

      await facebookAnalyticsService.getAnalyticsReport(PAGE_ID, TOKEN, '2026-01-01', '2026-01-10', 100);

      expect(facebookGateway.getPageFeed.mock.calls.length).toBeLessThanOrEqual(20);
    });
  });

  describe('story insights fetched in parallel, not N+1', () => {
    it('fetches all stories concurrently via Promise.all instead of sequentially', async () => {
      facebookGateway.getPageFeed.mockResolvedValue({ data: [], nextPageToken: null });
      facebookGateway.getPageStories.mockResolvedValue([
        { id: 'story-1', creation_time: '1735689600', media_type: 'IMAGE' },
        { id: 'story-2', creation_time: '1735689600', media_type: 'IMAGE' }
      ]);

      let concurrentCalls = 0;
      let maxConcurrent = 0;
      facebookGateway.getStoryInsights.mockImplementation(async () => {
        concurrentCalls++;
        maxConcurrent = Math.max(maxConcurrent, concurrentCalls);
        await new Promise((resolve) => setTimeout(resolve, 10));
        concurrentCalls--;
        return [{ name: 'reach', values: [{ value: 100 }] }];
      });

      const result = await facebookAnalyticsService.getAnalyticsReport(PAGE_ID, TOKEN, '2026-01-01', '2026-01-10', 100);

      expect(maxConcurrent).toBe(2);
      expect(result.stories).toHaveLength(2);
    });
  });
});
