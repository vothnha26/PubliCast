const BaseSocialService = require('../base-social.service');
const threadsGateway = require('./threads.gateway');
const brandRepository = require('../../../repositories/workspace/brand.repository');
const prisma = require('../../../config/prisma');
const { PLATFORMS } = require('../../../utils/constants');
const logger = require('../../../utils/logger');

// Threads has no date-range filter for media, so — same as Instagram/TikTok
// — "recent posts" only exists as "keep paging until stale." Kept low since
// Threads publishing/reading shares the same 4800*Impressions/24h app-wide
// rate limit as Facebook/Instagram (developers.facebook.com/documentation/
// threads/overview).
const MAX_PAGE_COUNT = 5;

// Fallback when a brand has no active subscription — same conservative
// (FREE-tier) default used by the other platform services.
const DEFAULT_HISTORY_WINDOW_MONTHS = 1;

// getPublishedVideos()'s DB-first cache (see SocialPostMetric). Threads
// currently exposes no real insights (reach/views are left null — see the
// #97 fix below), so the DB cache mainly saves the feed call itself, not an
// insights N+1 the way Facebook/Instagram's does — still worth 24h TTL to
// avoid re-walking the account's history on every tab open.
const SOCIAL_POST_METRICS_TTL_MS = 24 * 60 * 60 * 1000;

class ThreadsService extends BaseSocialService {
  async getChannelInfo(auth, startDate, endDate) {
    try {
      const pageId = auth.igAccountId || auth.pageId;
      const pageAccessToken = auth.pageAccessToken || auth.accessToken;
      
      const profile = await threadsGateway.getAccountDetails(pageAccessToken);
      
      return {
        igAccountId: profile.id,
        username: profile.username,
        displayName: profile.name || profile.username,
        profilePictureUrl: profile.threads_profile_picture_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
        followersCount: 0, // Sẽ điền thêm từ insights nếu có
        followingCount: 0,
        mediaCount: 0,
        biography: profile.threads_biography || '',
        website: '',
        analytics: []
      };
    } catch (error) {
      console.error('Threads getChannelInfo error:', error);
      // Previously this replaced ANY failure — expired token, revoked
      // permission, network error, rate limit — with a fabricated account
      // (followersCount:1500, followingCount:300, mediaCount:10) presented
      // indistinguishably from real profile data, only visible via a
      // console.error the user never sees (#97). degraded:true now signals
      // this is not real data instead of silently faking it.
      return {
        igAccountId: auth.platformAccountId || null,
        username: auth.username || null,
        displayName: auth.displayName || 'Threads Account',
        profilePictureUrl: auth.profilePictureUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
        followersCount: null,
        followingCount: null,
        mediaCount: null,
        biography: '',
        website: '',
        analytics: [],
        degraded: true,
        error: error.message
      };
    }
  }

  async getAnalyticsReport(auth, startDate, endDate) {
    const pageId = auth.igAccountId || auth.pageId || auth.platformAccountId;
    const pageAccessToken = auth.pageAccessToken || auth.accessToken;
    
    const isMock = pageAccessToken && pageAccessToken.startsWith('mock-');
    let insights = null;
    
    if (pageAccessToken && !isMock) {
      try {
        insights = await threadsGateway.getInsights(pageId, pageAccessToken);
      } catch (e) {
        // getInsights now throws instead of silently returning null (#97) —
        // this is a real, surfaced error (expired token, missing scope, rate
        // limit, etc). Logged and degraded to feed-derived/zero data below,
        // rather than crashing the whole analytics report over one metric call.
        console.warn('Threads Insights API failed, degrading to feed-derived data:', e.message);
      }
    }

    const now = new Date();
    const defaultStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const defaultEnd = now.toISOString().split('T')[0];
    let start = startDate || defaultStart;
    let end = endDate || defaultEnd;

    if (start === end) {
      const prevDate = new Date(new Date(start).getTime() - 24 * 60 * 60 * 1000);
      start = prevDate.toISOString().split('T')[0];
    }

    const startMs = new Date(start + 'T00:00:00Z').getTime();
    const endMs = new Date(end + 'T00:00:00Z').getTime();
    const oneDayMs = 24 * 60 * 60 * 1000;

    const dailyMap = {};
    for (let time = startMs; time <= endMs; time += oneDayMs) {
      const dateStr = new Date(time).toISOString().split('T')[0];
      dailyMap[dateStr] = {
        date: dateStr,
        views: 0,
        likes: 0,
        replies: 0,
        reposts: 0,
        followersCount: 0,
        acquired: 0,
        lost: 0,
        totalContent: 0
      };
    }

    // Populate real insights if available
    if (insights && Array.isArray(insights.data)) {
      for (const metric of insights.data) {
        if (!metric.values) continue;
        for (const val of metric.values) {
          const dateStr = val.end_time.split('T')[0];
          if (dailyMap[dateStr]) {
            if (metric.name === 'views') dailyMap[dateStr].views = val.value || 0;
            else if (metric.name === 'likes') dailyMap[dateStr].likes = val.value || 0;
            else if (metric.name === 'replies') dailyMap[dateStr].replies = val.value || 0;
            else if (metric.name === 'reposts') dailyMap[dateStr].reposts = val.value || 0;
            else if (metric.name === 'followers_count') {
              dailyMap[dateStr].followersCount = val.value || 0;
            }
          }
        }
      }
    }

    // Fetch and aggregate from real Threads posts feed if insights are empty or null
    let feedResult = [];
    if (!isMock) {
      try {
        const res = await threadsGateway.getThreadsMediaFeed(pageId, pageAccessToken, null, 100);
        feedResult = res.data || [];
      } catch (feedErr) {
        console.warn('Failed to fetch Threads feed for analytics aggregation:', feedErr.message);
      }
    }

    if (!isMock && feedResult.length > 0) {
      for (const post of feedResult) {
        if (!post.timestamp) continue;
        const dateStr = post.timestamp.split('T')[0];
        if (dailyMap[dateStr]) {
          dailyMap[dateStr].totalContent += 1;

          // Only aggregate if this date didn't have data from insights
          const reactions = post.like_count || 0;
          dailyMap[dateStr].likes += reactions;

          // Views intentionally NOT estimated from likes here — the Threads
          // feed endpoint doesn't return a real per-post view count, and
          // reactions*12 was an arbitrary made-up multiplier presented as
          // real view data (#97). views stays whatever getInsights (the
          // real API for this metric) already populated above, or 0 if
          // that call failed/returned no data for this date.
        }
      }
    }

    const sortedKeys = Object.keys(dailyMap).sort();
    let index = 0;
    for (const dateStr of sortedKeys) {
      const d = dailyMap[dateStr];
      if (isMock) {
        d.views = 0;
        d.likes = 0;
        d.replies = 0;
        d.reposts = 0;
        d.acquired = 0;
        d.lost = 0;
        d.followersCount = 0;
        d.totalContent = 0;
      } else {
        d.acquired = 0;
        d.lost = 0;
      }
      index++;
    }

    // Progressive followersCount calculation for real accounts
    if (!isMock) {
      let tempFollowers = auth.instagramAccount?.followersCount || auth.followersCount || 100;
      for (let i = sortedKeys.length - 1; i >= 0; i--) {
        const dateStr = sortedKeys[i];
        dailyMap[dateStr].followersCount = tempFollowers;
        tempFollowers = Math.max(0, tempFollowers - (dailyMap[dateStr].acquired - dailyMap[dateStr].lost));
      }
    }

    const sortedDates = sortedKeys.map(k => dailyMap[k]);
    const analytics = sortedDates.map(a => ({
      date: a.date,
      views: a.views,
      likes: a.likes,
      replies: a.replies,
      reposts: a.reposts,
      followersCount: a.followersCount || 0,
      totalContent: a.totalContent
    }));

    const balance = sortedDates.map(b => ({
      date: b.date,
      acquired: b.acquired,
      lost: b.lost
    }));

    const summary = {
      views: insights?.data?.find(m => m.name === 'views')?.values?.[0]?.value || analytics.reduce((acc, curr) => acc + curr.views, 0),
      likes: insights?.data?.find(m => m.name === 'likes')?.values?.[0]?.value || analytics.reduce((acc, curr) => acc + curr.likes, 0),
      replies: insights?.data?.find(m => m.name === 'replies')?.values?.[0]?.value || analytics.reduce((acc, curr) => acc + curr.replies, 0),
      reposts: insights?.data?.find(m => m.name === 'reposts')?.values?.[0]?.value || analytics.reduce((acc, curr) => acc + curr.reposts, 0),
      followersCount: insights?.data?.find(m => m.name === 'followers_count')?.values?.[0]?.value || auth.instagramAccount?.followersCount || auth.followersCount || 0,
      totalContent: analytics.reduce((acc, curr) => acc + curr.totalContent, 0)
    };

    // Calculate real post type breakdown
    const typesBreakdown = { TEXT: 0, IMAGE: 0, VIDEO: 0 };
    if (!isMock && feedResult.length > 0) {
      for (const post of feedResult) {
        const mediaType = post.media_type;
        let type = 'TEXT';
        if (mediaType === 'IMAGE' || mediaType === 'CAROUSEL_ALBUM') {
          type = 'IMAGE';
        } else if (mediaType === 'VIDEO') {
          type = 'VIDEO';
        }
        typesBreakdown[type]++;
      }
    } else if (isMock) {
      // Mock account has 0
      typesBreakdown.TEXT = 0;
      typesBreakdown.IMAGE = 0;
      typesBreakdown.VIDEO = 0;
    } else {
      // Real account but no posts in feed
      typesBreakdown.TEXT = 0;
      typesBreakdown.IMAGE = 0;
      typesBreakdown.VIDEO = 0;
    }

    return {
      audienceDemographicsJson: JSON.stringify({
        growth: analytics.map(a => ({
          date: a.date,
          views: a.views,
          reactions: a.likes,
          comments: a.replies,
          shares: a.reposts,
          totalContent: a.totalContent
        })),
        balance: balance,
        clicks: analytics.map(a => ({ date: a.date, totalClicks: Math.floor(a.likes * 0.1) })),
        summary: summary,
        interactions: {
          comments: summary.replies,
          shares: summary.reposts,
          typesBreakdown: typesBreakdown
          // viewsBreakdown removed — it derived a 90/10 organic/promoted
          // split from summary.views using a fixed ratio, with no real
          // organic/sponsored breakdown source fetched anywhere here (#97,
          // same fabrication pattern already removed for Facebook/Instagram in #69).
        }
      })
    };
  }

  async connectChannel(brandId, code, redirectUri) {
    const { ConnectionConflictGuard, ConnectionConflictError } = require('../connection-conflict.guard');
    
    // 1. Đổi code lấy short-lived access token
    const shortTokenRes = await threadsGateway.exchangeCodeForToken(code, redirectUri);
    const shortToken = shortTokenRes.access_token;
    const userId = shortTokenRes.user_id;

    // 2. Đổi lấy long-lived access token (60 ngày)
    const longTokenRes = await threadsGateway.getLongLivedToken(shortToken);
    const longToken = longTokenRes.access_token;

    // 3. Lấy thông tin chi tiết profile thật
    const profile = await threadsGateway.getAccountDetails(longToken);

    // 4. Lấy mock analytics report ban đầu
    const report = await this.getAnalyticsReport({
      igAccountId: profile.id,
      pageAccessToken: longToken
    });

    // 5. Lưu vào Database
    return require('../../../repositories/social/social-account.repository').upsertInstagramAccount(brandId, {
      igAccountId: profile.id,
      username: profile.username,
      displayName: profile.name || profile.username,
      profilePictureUrl: profile.threads_profile_picture_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
      followersCount: 12500,
      followingCount: 300,
      mediaCount: 10,
      biography: profile.threads_biography || '',
      website: '',
      analytics: report
    }, {
      access_token: longToken,
      refresh_token: '' // Threads long-lived token tự gia hạn không cần refresh_token
    }, PLATFORMS.THREADS);
  }

  async syncChannelMetrics(socialAccountId, startDate, endDate, force = false) {
    const account = await require('../../../repositories/social/social-account.repository').findById(socialAccountId);
    if (!account || account.platform !== PLATFORMS.THREADS) {
      throw new Error('Social account not found or is not a Threads account');
    }
    
    const profile = await this.getChannelInfo({
      igAccountId: account.platformAccountId,
      pageAccessToken: account.accessToken
    });

    const report = await this.getAnalyticsReport({
      igAccountId: account.platformAccountId,
      pageAccessToken: account.accessToken
    }, startDate, endDate);

    // enqueueSync: false — đây CHÍNH LÀ sync job đang chạy; xem ghi chú tương tự ở
    // youtube-analytics.service.js syncChannelMetrics.
    return require('../../../repositories/social/social-account.repository').upsertInstagramAccount(account.brandId, {
      igAccountId: account.platformAccountId,
      username: profile.username,
      displayName: profile.displayName,
      profilePictureUrl: profile.profilePictureUrl,
      followersCount: profile.followersCount || 12500,
      followingCount: profile.followingCount || 300,
      mediaCount: profile.mediaCount || 10,
      biography: profile.biography,
      website: profile.website,
      analytics: report
    }, {
      access_token: account.accessToken,
      refresh_token: account.refreshToken
    }, PLATFORMS.THREADS, { enqueueSync: false });
  }

  async getPublishedVideos(brandId, pageToken = null, limit = 10, socialAccountId = null) {
    try {
      const account = await require('../../../repositories/social/social-account.repository').findByBrandAndPlatform(brandId, PLATFORMS.THREADS);
      if (!account || account.length === 0) {
        return { data: [], nextPageToken: null, prevPageToken: null };
      }

      // socialAccountId picks a specific Threads account when the brand has
      // more than one connected; omitted, falls back to the first one
      // (correct as long as the brand only has one, still the common case).
      const activeAccount = (socialAccountId && account.find(acc => acc.id === socialAccountId)) || account[0];
      const pageId = activeAccount.platformAccountId;
      const accessToken = activeAccount.accessToken;

      if (accessToken && accessToken.startsWith('mock-')) {
        return { data: [], nextPageToken: null, prevPageToken: null };
      }

      // The initial load (no explicit pageToken) is DB-first (see
      // SocialPostMetric), only falling through to the live page-walk when
      // the DB has nothing fresh enough for the brand's plan window. An
      // explicit pageToken (manual "next page" click) always goes live.
      if (pageToken) {
        return await this._fetchThreadsSinglePage(pageId, accessToken, pageToken, limit);
      }

      const windowMonths = await this._getHistoryWindowMonths(brandId);
      let result = await this._fetchThreadsFromDbCache(brandId, activeAccount.id, windowMonths);
      if (!result) {
        result = await this._fetchThreadsRecentWindow(brandId, pageId, accessToken, windowMonths, limit);
        this._persistThreadsPostMetrics(brandId, activeAccount.id, result.data).catch(err => {
          console.warn('[ThreadsService] Failed to persist post metrics cache:', err.message);
        });
      }
      return result;
    } catch (error) {
      console.error('Threads getPublishedVideos error:', error);
      return {
        data: [],
        nextPageToken: null,
        prevPageToken: null
      };
    }
  }

  _formatThreadsPost(post) {
    const reactions = post.like_count || 0;
    const comments = 0; // Threads API v1.0 chưa trả về comments_count trực tiếp dễ dàng
    const shares = 0;
    const clicks = 0;
    // The Threads feed endpoint (getThreadsMediaFeed) doesn't return a
    // real per-post views/reach count — these were previously
    // reactions*12 / reactions*8, arbitrary made-up multipliers
    // presented as measured data (#97). Left null (unavailable) rather
    // than fabricated; engagement can't be computed without a real reach.
    return {
      id: post.id,
      message: post.text || 'Threads Post',
      type: post.media_type || 'TEXT',
      mediaUrl: post.media_url || '',
      postUrl: post.permalink || null,
      date: post.timestamp,
      status: 'PUBLISHED',
      reach: null,
      views: null,
      reactions,
      comments,
      shares,
      clicks,
      engagement: null
    };
  }

  async _fetchThreadsSinglePage(pageId, accessToken, pageToken, limit) {
    const feedResult = await threadsGateway.getThreadsMediaFeed(pageId, accessToken, pageToken, limit);
    return {
      data: (feedResult.data || []).map(post => this._formatThreadsPost(post)),
      nextPageToken: feedResult.nextPageToken || null,
      prevPageToken: feedResult.prevPageToken || null
    };
  }

  /** Walks pages from the start, stopping at whichever comes first: a post
   * older than the brand's plan-based history window, or MAX_PAGE_COUNT. */
  async _fetchThreadsRecentWindow(brandId, pageId, accessToken, windowMonths, limit) {
    const recentCutoff = new Date();
    recentCutoff.setMonth(recentCutoff.getMonth() - windowMonths);

    let pageToken = null;
    let posts = [];
    let hasMore = true;
    let pageCount = 0;

    while (hasMore && pageCount < MAX_PAGE_COUNT) {
      pageCount += 1;
      const feedResult = await threadsGateway.getThreadsMediaFeed(pageId, accessToken, pageToken, limit);
      const feed = feedResult.data || [];
      if (feed.length === 0) break;

      // Threads returns posts newest-first, so once one post in a page is
      // older than the cutoff, every post after it (this page and all
      // subsequent pages) is guaranteed older too.
      const cutoffIndex = feed.findIndex(p => p.timestamp && new Date(p.timestamp) < recentCutoff);
      const pageFeed = cutoffIndex === -1 ? feed : feed.slice(0, cutoffIndex);
      posts = posts.concat(pageFeed.map(post => this._formatThreadsPost(post)));

      if (cutoffIndex === -1) {
        hasMore = Boolean(feedResult.nextPageToken);
        pageToken = feedResult.nextPageToken || null;
      } else {
        hasMore = false;
      }
    }

    return { data: posts, nextPageToken: null, prevPageToken: null };
  }

  async _getHistoryWindowMonths(brandId) {
    const brand = await brandRepository.findBrandWithSubscription(brandId);
    const planLimit = brand?.subscription?.status === 'ACTIVE' ? brand.subscription.plan?.planLimit : null;
    return planLimit?.historyWindowMonths || DEFAULT_HISTORY_WINDOW_MONTHS;
  }

  /** DB-first read path (see SocialPostMetric in schema.prisma). Mirrors
   * FacebookPostService/InstagramPostService's _fetchFromDbCache. */
  async _fetchThreadsFromDbCache(brandId, socialAccountId, windowMonths) {
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - windowMonths);

    const rows = await prisma.socialPostMetric.findMany({
      where: { brandId, socialAccountId, platform: PLATFORMS.THREADS, publishedAt: { gte: cutoff } },
      orderBy: { publishedAt: 'desc' }
    });
    if (rows.length === 0) return null;

    const newestFetch = rows.reduce((max, r) => (r.fetchedAt > max ? r.fetchedAt : max), rows[0].fetchedAt);
    if (Date.now() - newestFetch.getTime() >= SOCIAL_POST_METRICS_TTL_MS) return null;

    return {
      data: rows.map(r => ({
        id: r.platformPostId,
        message: r.captionSnippet || 'Threads Post',
        type: r.postType || 'TEXT',
        mediaUrl: r.thumbnailUrl || '',
        postUrl: r.postUrl || null,
        date: r.publishedAt,
        status: 'PUBLISHED',
        reach: null,
        views: null,
        reactions: r.likes,
        comments: r.comments,
        shares: r.shares,
        clicks: r.clicks,
        engagement: null
      })),
      nextPageToken: null,
      prevPageToken: null
    };
  }

  /** Upserts the freshly-fetched page(s) of posts into SocialPostMetric so
   * the next getPublishedVideos call for this brand/account can be
   * DB-first instead of walking the live feed again. Best-effort. */
  async _persistThreadsPostMetrics(brandId, socialAccountId, posts) {
    for (const post of posts) {
      await prisma.socialPostMetric.upsert({
        where: { socialAccountId_platformPostId: { socialAccountId, platformPostId: post.id } },
        create: {
          brandId,
          socialAccountId,
          platform: PLATFORMS.THREADS,
          platformPostId: post.id,
          postType: post.type || null,
          publishedAt: post.date ? new Date(post.date) : null,
          likes: post.reactions || 0,
          comments: post.comments || 0,
          shares: post.shares || 0,
          clicks: post.clicks || 0,
          captionSnippet: post.message || null,
          thumbnailUrl: post.mediaUrl || null,
          postUrl: post.postUrl || null
        },
        update: {
          postType: post.type || null,
          publishedAt: post.date ? new Date(post.date) : null,
          likes: post.reactions || 0,
          comments: post.comments || 0,
          shares: post.shares || 0,
          clicks: post.clicks || 0,
          captionSnippet: post.message || null,
          thumbnailUrl: post.mediaUrl || null,
          postUrl: post.postUrl || null,
          fetchedAt: new Date()
        }
      }).catch(err => {
        console.warn(`[ThreadsService] Failed to upsert metrics for post ${post.id}:`, err.message);
      });
    }
  }

  async publishPost(brandId, postData) {
    const accounts = await require('../../../repositories/social/social-account.repository').findByBrandAndPlatform(brandId, PLATFORMS.THREADS);
    if (!accounts || accounts.length === 0) throw new Error('Threads account not linked');
    const account = accounts[0];
    const whoCanReply = postData.options?.threadsWhoCanReply || null;

    // Chuỗi thread nhiều bài (networkOverrides.threadPosts): [{text, mediaUrls}, ...].
    // Bài đầu tiên đăng như post gốc, các bài sau đăng làm reply nối tiếp bài
    // ngay trước đó (reply_to_id) để tạo thành 1 chuỗi thread thật trên Threads.
    const threadPosts = Array.isArray(postData.options?.threadPosts) && postData.options.threadPosts.length > 0
      ? postData.options.threadPosts
      : [{ text: postData.caption || '', mediaUrls: postData.mediaUrls || [] }];

    logger.debug(`\n[Threads] ▶ publishPost | brandId=${brandId} | userId=${account.platformAccountId} | postsInThread=${threadPosts.length}`);
    logger.debug(`[Threads] tokenPrefix=${account.accessToken?.substring(0, 10)}...`);

    try {
      let rootPostId = null;
      let previousPostId = null;

      for (let i = 0; i < threadPosts.length; i++) {
        const { text = '', mediaUrls = [] } = threadPosts[i] || {};
        const rawMediaUrl = mediaUrls.length > 0 ? mediaUrls[0] : null;
        const mediaUrl = this.resolveUrl(rawMediaUrl);

        let mediaType = 'TEXT';
        if (mediaUrl) {
          const isVideo = ['.mp4', '.mov', '.avi', '.mkv'].some(ext => mediaUrl.toLowerCase().endsWith(ext));
          mediaType = isVideo ? 'VIDEO' : 'IMAGE';
        }

        logger.debug(`[Threads] Creating media container for post ${i + 1}/${threadPosts.length} | mediaType=${mediaType} | replyToId=${previousPostId || 'none'}`);
        const container = await threadsGateway.createMediaContainer(
          account.platformAccountId,
          account.accessToken,
          text,
          mediaUrl,
          mediaType,
          whoCanReply,
          previousPostId
        );
        logger.debug(`[Threads] Container created | containerId=${container.id}`);

        if (mediaType !== 'TEXT') {
          const maxAttempts = 60;
          const intervalMs = 5000;
          let isReady = false;

          for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            const statusData = await threadsGateway.getContainerStatus(account.accessToken, container.id);
            const status = statusData.status;
            logger.debug(`[Threads Polling] Attempt ${attempt}/${maxAttempts} | Container: ${container.id} | Status: ${status}`);

            if (status === 'FINISHED') {
              isReady = true;
              break;
            }
            if (status === 'ERROR') {
              throw new Error(statusData.error_message || 'Threads media processing failed');
            }
            await new Promise(resolve => setTimeout(resolve, intervalMs));
          }

          if (!isReady) {
            throw new Error('Timeout waiting for Threads media container to be processed');
          }
        }

        logger.debug(`[Threads] Publishing container ${container.id}...`);
        const publishRes = await threadsGateway.publishMediaContainer(account.platformAccountId, account.accessToken, container.id);
        logger.debug(`[Threads] ✅ Published post ${i + 1}/${threadPosts.length} | platformPostId=${publishRes.id}`);

        if (i === 0) rootPostId = publishRes.id;
        previousPostId = publishRes.id;
      }

      // Post First Comment if published immediately
      if (postData.options?.firstComment?.trim()) {
        try {
          logger.debug(`[Threads] Posting first comment: "${postData.options.firstComment.trim()}"`);
          await threadsGateway.createComment(account.platformAccountId, account.accessToken, rootPostId, postData.options.firstComment.trim());
          logger.debug(`[Threads] First comment posted successfully.`);
        } catch (commentErr) {
          console.error(`[Threads] Failed to post first comment:`, commentErr.message);
        }
      }

      return {
        success: true,
        platformVideoId: rootPostId,
        publishedAt: new Date()
      };
    } catch (err) {
      console.error(`[Threads] ❌ Publish FAILED:`, err.message);
      if (err.response?.data) {
        console.error(`[Threads] API Error Detail:`, JSON.stringify(err.response.data));
      }
      throw err;
    }
  }

  async deletePost(brandId, platformPostId) {
    logger.debug(`[Threads Service] deletePost triggered for brandId: ${brandId}, platformPostId: ${platformPostId}`);
    const accounts = await require('../../../repositories/social/social-account.repository').findByBrandAndPlatform(brandId, PLATFORMS.THREADS);
    if (!accounts || accounts.length === 0) {
      console.warn(`[Threads Service] No connected Threads accounts found for brandId: ${brandId}`);
      throw new Error('Threads account not linked');
    }
    const account = accounts[0];
    logger.debug(`[Threads Service] Using connected Threads account: @${account.username} (${account.platformAccountId})`);
    logger.debug(`[Threads Service] Calling threadsGateway.deletePost with media ID: ${platformPostId}`);
    const res = await threadsGateway.deletePost(platformPostId, account.accessToken);
    logger.debug(`[Threads Service] threadsGateway.deletePost successful response:`, res);
    return res;
  }
}

module.exports = new ThreadsService();
