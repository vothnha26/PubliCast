const BaseTrendingStrategy = require('./BaseTrendingStrategy');

class MockTrendingStrategy extends BaseTrendingStrategy {
  async fetchTrending(limit) {
    const tags = [
      { hashtag: '#viral', postsCount: 450000, reach: 5000000, growthRate: 15.6 },
      { hashtag: '#love', postsCount: 380000, reach: 4200000, growthRate: 3.2 },
      { hashtag: '#instagood', postsCount: 310000, reach: 3500000, growthRate: 4.1 },
      { hashtag: '#fashion', postsCount: 290000, reach: 3200000, growthRate: 11.8 },
      { hashtag: '#beautiful', postsCount: 270000, reach: 2900000, growthRate: 5.7 },
      { hashtag: '#happy', postsCount: 250000, reach: 2700000, growthRate: 2.9 },
      { hashtag: '#tbt', postsCount: 220000, reach: 2400000, growthRate: -1.2 },
      { hashtag: '#cute', postsCount: 210000, reach: 2300000, growthRate: 6.8 },
      { hashtag: '#followme', postsCount: 190000, reach: 2100000, growthRate: 8.3 },
      { hashtag: '#like4like', postsCount: 180000, reach: 2000000, growthRate: 1.5 }
    ];
    return tags.slice(0, limit);
  }
}

module.exports = MockTrendingStrategy;
