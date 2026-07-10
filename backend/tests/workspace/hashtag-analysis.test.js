const request = require('supertest');
const app = require('../../src/app');
const prisma = require('../../src/config/prisma');

// Mock Auth Middleware
jest.mock('../../src/middlewares/auth.middleware', () => ({
  verifyAuth: (req, res, next) => {
    req.user = { id: 'test-user-id', email: 'user@publicast.com', name: 'Test User' };
    next();
  }
}));

// Mock Prisma
jest.mock('../../src/config/prisma', () => ({
  hashtagTracker: {
    findUnique: jest.fn(),
    update: jest.fn()
  }
}));

describe('Hashtag Analysis API Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 404 if hashtag tracker does not exist', async () => {
    prisma.hashtagTracker.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .get('/api/hashtags/analysis/invalid-id')
      .expect(404);

    expect(res.body.message).toBe('Tracked hashtag not found');
    expect(prisma.hashtagTracker.findUnique).toHaveBeenCalledWith({
      where: { id: 'invalid-id' }
    });
  });

  it('should generate and save analysis data if trendScoreJson is missing', async () => {
    const mockTracker = {
      id: 'tracker-123',
      brandId: 'brand-123',
      hashtag: '#inbound18',
      platform: 'INSTAGRAM',
      totalPosts: 50000,
      postsLast24h: 120,
      totalReach: 80000,
      avgEngagementRate: 4.5,
      trendDirection: 'UP',
      trendScoreJson: null,
      topPostsJson: null,
      lastFetchedAt: null,
      addedAt: new Date()
    };

    prisma.hashtagTracker.findUnique.mockResolvedValue(mockTracker);
    prisma.hashtagTracker.update.mockResolvedValue({
      ...mockTracker,
      trendScoreJson: '{}',
      topPostsJson: '{}'
    });

    const res = await request(app)
      .get('/api/hashtags/analysis/tracker-123')
      .expect(200);

    // Verify response structure
    expect(res.body.id).toBe('tracker-123');
    expect(res.body.hashtag).toBe('#inbound18');
    expect(res.body.summary).toBeDefined();
    expect(res.body.summary.posts).toBeDefined();
    expect(res.body.summary.averages).toBeDefined();
    
    expect(res.body.evolution).toBeDefined();
    expect(Array.isArray(res.body.evolution)).toBe(true);
    
    expect(res.body.distributions).toBeDefined();
    expect(res.body.distributions.languages).toBeDefined();
    expect(res.body.distributions.sources).toBeDefined();
    expect(res.body.distributions.types).toBeDefined();
    
    expect(res.body.countries).toBeDefined();
    expect(res.body.usedTags).toBeDefined();
    expect(res.body.usedTags[0].text).toBe('inbound18');
    
    expect(res.body.topPictures).toBeDefined();
    expect(res.body.topPictures).toHaveLength(25);
    expect(res.body.topPictures[0].url).toBeDefined();
    expect(res.body.topPictures[0].impressions).toBeDefined();
    
    expect(res.body.topParticipants).toBeDefined();
    expect(res.body.topParticipants).toHaveLength(100);
    
    expect(res.body.topPosts).toBeDefined();
    expect(res.body.topPosts).toHaveLength(100);

    // Verify DB update was triggered
    expect(prisma.hashtagTracker.update).toHaveBeenCalledWith({
      where: { id: 'tracker-123' },
      data: {
        trendScoreJson: expect.any(String),
        topPostsJson: expect.any(String),
        lastFetchedAt: expect.any(Date)
      }
    });
  });

  it('should return cached analysis data if already present in DB', async () => {
    const cachedTrendScore = {
      summary: { posts: 1000, averages: {} },
      evolution: [],
      distributions: { languages: [], sources: [], types: [] },
      countries: [],
      usedTags: [{ text: 'cached-tag', value: 10 }],
      topPictures: [{ id: 1, url: 'img.png', impressions: 100 }]
    };

    const cachedTopPosts = {
      topParticipants: [{ name: 'Cached User' }],
      topPosts: [{ caption: 'Cached Post' }]
    };

    const mockTrackerWithCache = {
      id: 'tracker-123',
      brandId: 'brand-123',
      hashtag: '#inbound18',
      platform: 'INSTAGRAM',
      totalPosts: 50000,
      postsLast24h: 120,
      totalReach: 80000,
      avgEngagementRate: 4.5,
      trendDirection: 'UP',
      trendScoreJson: JSON.stringify(cachedTrendScore),
      topPostsJson: JSON.stringify(cachedTopPosts),
      lastFetchedAt: new Date(),
      addedAt: new Date()
    };

    prisma.hashtagTracker.findUnique.mockResolvedValue(mockTrackerWithCache);

    const res = await request(app)
      .get('/api/hashtags/analysis/tracker-123')
      .expect(200);

    // Verify cached data returned
    expect(res.body.usedTags[0].text).toBe('cached-tag');
    expect(res.body.topPictures[0].url).toBe('img.png');
    expect(res.body.topParticipants[0].name).toBe('Cached User');
    expect(res.body.topPosts[0].caption).toBe('Cached Post');

    // Verify DB update was NOT triggered
    expect(prisma.hashtagTracker.update).not.toHaveBeenCalled();
  });
});
