const blueskyAnalytics = require('../../src/services/social/bluesky/bluesky-analytics.service');
const blueskyGateway = require('../../src/services/social/bluesky/bluesky.gateway');

jest.mock('../../src/services/social/bluesky/bluesky.gateway');

describe('BlueskyAnalyticsService', () => {
  const mockAgent = {};
  const actorDid = 'did:plc:testuser123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAnalyticsReport', () => {
    it('aggregates real like/reply/repost counts from getAuthorFeed into a daily timeline', async () => {
      const today = new Date().toISOString().split('T')[0];
      blueskyGateway.getAuthorFeed.mockResolvedValueOnce({
        feed: [
          {
            post: {
              uri: 'at://did:plc:testuser123/app.bsky.feed.post/1',
              indexedAt: `${today}T10:00:00.000Z`,
              likeCount: 5,
              replyCount: 2,
              repostCount: 1,
              quoteCount: 0
            }
          },
          {
            post: {
              uri: 'at://did:plc:testuser123/app.bsky.feed.post/2',
              indexedAt: `${today}T12:00:00.000Z`,
              likeCount: 3,
              replyCount: 0,
              repostCount: 0,
              quoteCount: 1
            }
          }
        ],
        cursor: null
      });

      const report = await blueskyAnalytics.getAnalyticsReport(mockAgent, actorDid, today, today, 100);

      expect(report.summary.followers).toBe(100);
      expect(report.summary.totalContent).toBe(2);
      expect(report.interactions).toEqual({
        likes: 8,
        replies: 2,
        reposts: 1,
        quotes: 1,
        posts: 2,
        engagementsPerPost: 5.5
      });

      const todayBucket = report.growth.find((g) => g.date === today);
      expect(todayBucket.likes).toBe(8);
      expect(todayBucket.totalContent).toBe(2);
    });

    it('never fabricates reach/impressions data — only real counts appear', async () => {
      blueskyGateway.getAuthorFeed.mockResolvedValueOnce({ feed: [], cursor: null });

      const report = await blueskyAnalytics.getAnalyticsReport(mockAgent, actorDid, null, null, 0);

      expect(report.summary).not.toHaveProperty('reach');
      expect(report.summary).not.toHaveProperty('impressions');
      expect(report.interactions.posts).toBe(0);
    });

    it('stops paginating once posts fall outside the requested date range', async () => {
      const inRangeDate = '2026-08-01T10:00:00.000Z';
      const outOfRangeDate = '2026-06-01T10:00:00.000Z';

      blueskyGateway.getAuthorFeed.mockResolvedValueOnce({
        feed: [
          { post: { uri: 'p1', indexedAt: inRangeDate, likeCount: 1, replyCount: 0, repostCount: 0, quoteCount: 0 } },
          { post: { uri: 'p2', indexedAt: outOfRangeDate, likeCount: 99, replyCount: 0, repostCount: 0, quoteCount: 0 } }
        ],
        cursor: 'next-page-cursor'
      });

      const report = await blueskyAnalytics.getAnalyticsReport(mockAgent, actorDid, '2026-08-01', '2026-08-01', 10);

      // Only page fetched once — pagination stopped after the out-of-range post
      expect(blueskyGateway.getAuthorFeed).toHaveBeenCalledTimes(1);
      expect(report.interactions.posts).toBe(1);
      expect(report.interactions.likes).toBe(1);
    });
  });

  describe('getPublishedPosts', () => {
    it('maps author feed items to the published-posts shape with real engagement counts', async () => {
      blueskyGateway.getAuthorFeed.mockResolvedValueOnce({
        feed: [
          {
            post: {
              uri: 'at://did:plc:testuser123/app.bsky.feed.post/1',
              cid: 'cid-1',
              record: { text: 'Hello Bluesky', createdAt: '2026-08-01T10:00:00.000Z' },
              likeCount: 7,
              replyCount: 3,
              repostCount: 2,
              quoteCount: 1,
              embed: { images: [{ fullsize: 'https://example.com/img.jpg' }] }
            }
          }
        ],
        cursor: 'cursor-2'
      });

      const result = await blueskyAnalytics.getPublishedPosts(mockAgent, actorDid, { limit: 10 });

      expect(result.nextPageToken).toBe('cursor-2');
      expect(result.data).toEqual([
        {
          id: 'at://did:plc:testuser123/app.bsky.feed.post/1',
          uri: 'at://did:plc:testuser123/app.bsky.feed.post/1',
          cid: 'cid-1',
          message: 'Hello Bluesky',
          date: '2026-08-01T10:00:00.000Z',
          mediaUrl: 'https://example.com/img.jpg',
          likes: 7,
          comments: 3,
          reposts: 2,
          quotes: 1,
          reach: 0,
          views: 0
        }
      ]);
    });
  });
});
