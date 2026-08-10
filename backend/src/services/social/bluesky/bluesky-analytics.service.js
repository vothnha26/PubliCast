const blueskyGateway = require('./bluesky.gateway');

class BlueskyAnalyticsService {
  _resolveDates(startDate, endDate) {
    const now = new Date();
    const defaultStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const defaultEnd = now.toISOString().split('T')[0];

    let start = startDate || defaultStart;
    let end = endDate || defaultEnd;

    if (start === end) {
      const prevDate = new Date(new Date(start).getTime() - 24 * 60 * 60 * 1000);
      start = prevDate.toISOString().split('T')[0];
    }

    return { start, end };
  }

  _initializeDailyMap(start, end) {
    const dailyMap = {};
    const startMs = new Date(start + 'T00:00:00Z').getTime();
    const endMs = new Date(end + 'T00:00:00Z').getTime();
    const oneDayMs = 24 * 60 * 60 * 1000;

    for (let time = startMs; time <= endMs; time += oneDayMs) {
      const dateStr = new Date(time).toISOString().split('T')[0];
      dailyMap[dateStr] = {
        date: dateStr,
        name: new Date(time).toLocaleDateString('vi-VN', { month: 'short', day: 'numeric', timeZone: 'UTC' }),
        followers: 0,
        totalContent: 0,
        likes: 0,
        replies: 0,
        reposts: 0,
        quotes: 0,
        acquired: 0,
        lost: 0
      };
    }
    return dailyMap;
  }

  /**
   * Real per-post engagement pulled from the account's own author feed —
   * each feed item already carries like/repost/reply/quote counts inline,
   * no separate per-post metrics call needed. AT Protocol's public API has
   * no reach/impressions concept for
   * a developer app, so unlike Instagram/Facebook this never populates
   * `impressions`/`reach` — see saveBlueskyAnalytics in
   * social-account.repository.js for where that's left honestly at 0
   * rather than fabricated.
   */
  async getAnalyticsReport(agent, actorDid, startDate, endDate, currentFollowersCount = 0) {
    const { start, end } = this._resolveDates(startDate, endDate);
    const dailyMap = this._initializeDailyMap(start, end);
    const rangeStartMs = new Date(start + 'T00:00:00Z').getTime();

    const feedStats = {
      totalPostsInPeriod: 0,
      totalLikes: 0,
      totalReplies: 0,
      totalReposts: 0,
      totalQuotes: 0
    };

    // Paginate the author feed for the full period — same reasoning as
    // Instagram's feed pagination (#70): a single page silently drops
    // older posts for accounts with a longer history within range.
    const MAX_FEED_PAGES = 20;
    let cursor;
    outer: for (let page = 0; page < MAX_FEED_PAGES; page++) {
      const result = await blueskyGateway.getAuthorFeed(agent, { actor: actorDid, limit: 50, cursor }).catch(() => ({ feed: [] }));
      const items = result.feed || [];
      if (items.length === 0) break;

      for (const item of items) {
        const post = item.post;
        if (!post?.indexedAt) continue;
        const postMs = new Date(post.indexedAt).getTime();
        if (postMs < rangeStartMs) break outer;

        const dateStr = post.indexedAt.split('T')[0];
        const bucket = dailyMap[dateStr];
        const likeCount = post.likeCount || 0;
        const replyCount = post.replyCount || 0;
        const repostCount = post.repostCount || 0;
        const quoteCount = post.quoteCount || 0;

        if (bucket) {
          bucket.totalContent += 1;
          bucket.likes += likeCount;
          bucket.replies += replyCount;
          bucket.reposts += repostCount;
          bucket.quotes += quoteCount;
        }

        feedStats.totalPostsInPeriod += 1;
        feedStats.totalLikes += likeCount;
        feedStats.totalReplies += replyCount;
        feedStats.totalReposts += repostCount;
        feedStats.totalQuotes += quoteCount;
      }

      if (!result.cursor) break;
      cursor = result.cursor;
    }

    const sortedDates = Object.keys(dailyMap).sort().map((d) => dailyMap[d]);

    let tempFollowers = currentFollowersCount;
    for (let i = sortedDates.length - 1; i >= 0; i--) {
      sortedDates[i].followers = tempFollowers;
      tempFollowers = Math.max(0, tempFollowers - (sortedDates[i].acquired || 0) + (sortedDates[i].lost || 0));
    }

    const daysCount = sortedDates.length || 1;
    const dailyPosts = parseFloat((feedStats.totalPostsInPeriod / daysCount).toFixed(2));
    const postsPerWeek = parseFloat((dailyPosts * 7).toFixed(2));
    const engagementsPerPost = feedStats.totalPostsInPeriod
      ? parseFloat(((feedStats.totalLikes + feedStats.totalReplies + feedStats.totalReposts) / feedStats.totalPostsInPeriod).toFixed(2))
      : 0;

    return {
      startDate: sortedDates[0]?.date,
      endDate: sortedDates[sortedDates.length - 1]?.date,
      summary: {
        followers: currentFollowersCount,
        totalContent: feedStats.totalPostsInPeriod,
        dailyPosts,
        postsPerWeek
      },
      growth: sortedDates.map((d) => ({
        date: d.date,
        name: d.name,
        followers: d.followers,
        totalContent: d.totalContent,
        likes: d.likes,
        replies: d.replies,
        reposts: d.reposts,
        quotes: d.quotes,
        acquired: d.acquired,
        lost: d.lost
      })),
      balance: sortedDates.map((d) => ({ date: d.date, name: d.name, acquired: d.acquired, lost: d.lost, totalFollowers: d.followers, totalContent: d.totalContent })),
      interactions: {
        likes: feedStats.totalLikes,
        replies: feedStats.totalReplies,
        reposts: feedStats.totalReposts,
        quotes: feedStats.totalQuotes,
        posts: feedStats.totalPostsInPeriod,
        engagementsPerPost
      }
    };
  }

  /**
   * Lists the account's own posts for the Posts Library / published-content
   * tab, mapping AT Protocol's getAuthorFeed items to the shape other
   * platforms' getPublishedVideos returns. Each item carries real
   * like/repost/reply counts — no more hardcoded zeros (see
   * useChannelInsights.js's old bluesky branch, fixed alongside this).
   */
  async getPublishedPosts(agent, actorDid, { limit = 10, cursor } = {}) {
    const result = await blueskyGateway.getAuthorFeed(agent, { actor: actorDid, limit, cursor, filter: 'posts_no_replies' });
    const items = (result.feed || []).map((item) => {
      const post = item.post;
      return {
        id: post.uri,
        uri: post.uri,
        cid: post.cid,
        message: post.record?.text || '',
        date: post.record?.createdAt || post.indexedAt,
        mediaUrl:
          post.embed?.images?.[0]?.fullsize ||
          post.embed?.images?.[0]?.thumb ||
          post.embed?.thumbnail ||
          post.embed?.external?.thumb ||
          post.embed?.media?.images?.[0]?.fullsize ||
          post.embed?.media?.images?.[0]?.thumb ||
          post.embed?.media?.thumbnail ||
          post.embed?.media?.external?.thumb ||
          null,
        likes: post.likeCount || 0,
        comments: post.replyCount || 0,
        reposts: post.repostCount || 0,
        quotes: post.quoteCount || 0,
        // No reach/impressions concept in AT Protocol's public API — see
        // getAnalyticsReport's note above.
        reach: 0,
        views: 0
      };
    });

    return { data: items, nextPageToken: result.cursor || null };
  }
}

module.exports = new BlueskyAnalyticsService();
