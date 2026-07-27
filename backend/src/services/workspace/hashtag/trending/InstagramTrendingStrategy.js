const BaseTrendingStrategy = require('./BaseTrendingStrategy');

class InstagramTrendingStrategy extends BaseTrendingStrategy {
  async fetchTrending(limit) {
    const tags = [
      { hashtag: '#photography', postsCount: 125000, reach: 980000, growthRate: 12.5 },
      { hashtag: '#travelgram', postsCount: 98000, reach: 750000, growthRate: 8.3 },
      { hashtag: '#ootd', postsCount: 84000, reach: 680000, growthRate: 15.1 },
      { hashtag: '#instafood', postsCount: 72000, reach: 590000, growthRate: 5.4 },
      { hashtag: '#fitnessmotivation', postsCount: 68000, reach: 540000, growthRate: 11.2 },
      { hashtag: '#naturelovers', postsCount: 62000, reach: 490000, growthRate: 3.2 },
      { hashtag: '#artdaily', postsCount: 59000, reach: 450000, growthRate: 9.7 },
      { hashtag: '#homedecor', postsCount: 51000, reach: 390000, growthRate: 7.1 },
      { hashtag: '#makeupoftheday', postsCount: 48000, reach: 370000, growthRate: 14.3 },
      { hashtag: '#petstagram', postsCount: 45000, reach: 350000, growthRate: 6.8 },
      { hashtag: '#sunsetpics', postsCount: 42000, reach: 310000, growthRate: 4.5 },
      { hashtag: '#mindsetmatters', postsCount: 39000, reach: 290000, growthRate: 18.2 },
      { hashtag: '#digitalmarketing', postsCount: 37000, reach: 270000, growthRate: 10.4 },
      { hashtag: '#healthyrecipes', postsCount: 35000, reach: 250000, growthRate: 7.8 },
      { hashtag: '#streetstyle', postsCount: 32000, reach: 230000, growthRate: 12.1 },
      { hashtag: '#gadgets', postsCount: 29000, reach: 210000, growthRate: 16.5 },
      { hashtag: '#wanderlust', postsCount: 27000, reach: 190000, growthRate: 9.1 },
      { hashtag: '#diycrafts', postsCount: 25000, reach: 180000, growthRate: 5.9 },
      { hashtag: '#productivitytips', postsCount: 23000, reach: 160000, growthRate: 13.7 },
      { hashtag: '#couplegoals', postsCount: 21000, reach: 150000, growthRate: 8.2 }
    ];
    return tags.slice(0, limit);
  }
}

module.exports = InstagramTrendingStrategy;
