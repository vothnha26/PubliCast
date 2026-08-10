const BaseSocialService = require('../base-social.service');
const threadsGateway = require('./threads.gateway');
const { getHistoryWindowMonths } = require('../plan-history-window.util');
const { PLATFORMS } = require('../../../utils/constants');
const { THREADS_MEDIA_TYPE, THREADS_CONTAINER_STATUS } = require('./threads.constants');
const { computeCommentScore } = require('../../../utils/comment-score.util');
const logger = require('../../../utils/logger');
const { upsertPostMetricsDaily, findLatestPostMetrics } = require('../post-metric-daily-persistence.util');

// Threads has no date-range filter for media, so — same as Instagram/TikTok
// — "recent posts" only exists as "keep paging until stale." Kept low since
// Threads publishing/reading shares the same 4800*Impressions/24h app-wide
// rate limit as Facebook/Instagram (developers.facebook.com/documentation/
// threads/overview).
const MAX_PAGE_COUNT = 5;

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

    // Fetch and aggregate from real Threads posts feed if insights are empty or null.
    // Paginate for the full period instead of a single limit=100 page — a
    // single page silently drops older posts for accounts with a longer
    // feed within the requested date range, undercounting totalContent and
    // making the per-load post count drift (same class of bug fixed for
    // Facebook in #70, and for Instagram alongside this change). Stop once
    // the feed runs out, a page comes back entirely older than the range's
    // start date (feed is reverse-chronological), or a safety cap is hit.
    let feedResult = [];
    if (!isMock) {
      try {
        const MAX_FEED_PAGES = 20;
        const rangeStartMs = new Date(start).getTime();
        let feedPageToken = null;
        for (let page = 0; page < MAX_FEED_PAGES; page++) {
          const res = await threadsGateway.getThreadsMediaFeed(pageId, pageAccessToken, feedPageToken, 100);
          const pagePosts = res.data || [];
          feedResult = feedResult.concat(pagePosts);

          const oldestInPage = pagePosts[pagePosts.length - 1];
          const pageIsFullyBeforeRange = oldestInPage && new Date(oldestInPage.timestamp).getTime() < rangeStartMs;

          if (!res.nextPageToken || pagePosts.length === 0 || pageIsFullyBeforeRange) {
            break;
          }
          feedPageToken = res.nextPageToken;
        }
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

    // No progressive backward-reconstruction here (unlike YouTube/Facebook) —
    // acquired/lost are always 0 above (Threads has no real follower-delta
    // metric), so "reconstructing" from a seed would only ever produce that
    // same seed value for every day, dressed up as if it were real
    // per-day history. dailyMap[dateStr].followersCount already holds
    // whatever the real followers_count Insights metric returned (line
    // ~131 above), or stays 0 for any day that metric didn't cover.
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
      lost: b.lost,
      totalFollowers: b.followersCount
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
        let type = THREADS_MEDIA_TYPE.TEXT;
        if (mediaType === THREADS_MEDIA_TYPE.IMAGE || mediaType === THREADS_MEDIA_TYPE.CAROUSEL_ALBUM) {
          type = THREADS_MEDIA_TYPE.IMAGE;
        } else if (mediaType === THREADS_MEDIA_TYPE.VIDEO) {
          type = THREADS_MEDIA_TYPE.VIDEO;
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

    // Returns a flat object — growth/balance/summary/etc. directly on the
    // result, matching Facebook/Instagram/TikTok/Bluesky's getAnalyticsReport
    // shape. This used to wrap the whole thing as a pre-stringified
    // `audienceDemographicsJson` field instead, which meant
    // saveInstagramAnalytics's own `JSON.stringify(analyticsData)` (it's
    // written to the same SocialAnalytics.audienceDemographicsJson column)
    // double-encoded it — `{"audienceDemographicsJson":"{\"growth\":...}"}` —
    // and every field this function computed (balance, summary, growth...)
    // silently vanished from what the DB actually stored (bug fixed
    // 2026-08-10: Threads' Balance of Followers chart, and everything else
    // reading this JSON, saw none of it).
    return {
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

    // 4. Lấy analytics report thật (bao gồm followers_count thật từ Threads
    // Insights API nếu token có quyền — xem getAnalyticsReport's summary)
    const report = await this.getAnalyticsReport({
      igAccountId: profile.id,
      pageAccessToken: longToken
    });

    // followersCount lấy từ report.summary (đã ưu tiên giá trị thật từ
    // Insights, xem getAnalyticsReport). followingCount/mediaCount không có
    // API thật nào của Threads trả về (getAccountDetails/getInsights đều
    // không có field này) — để null, không bịa số như 300/10 trước đây (#97).
    const summary = report.summary;

    // 5. Lưu vào Database
    return require('../../../repositories/social/social-account.repository').upsertThreadsAccount(brandId, {
      igAccountId: profile.id,
      username: profile.username,
      displayName: profile.name || profile.username,
      profilePictureUrl: profile.threads_profile_picture_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
      followersCount: summary.followersCount || 0,
      followingCount: null,
      mediaCount: null,
      biography: profile.threads_biography || '',
      website: '',
      analytics: report
    }, {
      access_token: longToken,
      refresh_token: '' // Threads long-lived token tự gia hạn không cần refresh_token
    });
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

    // profile.followersCount is always 0 here — getChannelInfo never calls
    // Insights, only getAccountDetails, which has no follower field at all.
    // The real value (when the token has permission) lives in the analytics
    // report's summary instead — see getAnalyticsReport. followingCount/
    // mediaCount have no real Threads API source anywhere; null, not a
    // fabricated 300/10 (#97).
    const summary = report.summary;

    // enqueueSync: false — đây CHÍNH LÀ sync job đang chạy; xem ghi chú tương tự ở
    // youtube-analytics.service.js syncChannelMetrics.
    return require('../../../repositories/social/social-account.repository').upsertThreadsAccount(account.brandId, {
      igAccountId: account.platformAccountId,
      username: profile.username,
      displayName: profile.displayName,
      profilePictureUrl: profile.profilePictureUrl,
      followersCount: summary.followersCount || 0,
      followingCount: null,
      mediaCount: null,
      biography: profile.biography,
      website: profile.website,
      analytics: report
    }, {
      access_token: account.accessToken,
      refresh_token: account.refreshToken
    }, { enqueueSync: false });
  }

  /**
   * Smart Fetch: DB-only read, no live Threads API call is ever triggered
   * from this method — see FacebookPostService#getPublishedPosts for the
   * full rationale. `pageToken` also reads DB only.
   */
  async getPublishedVideos(brandId, pageToken = null, limit = 10, socialAccountId = null, startDate = null, endDate = null) {
    try {
      // findByBrandAndPlatformLite (not findByBrandAndPlatform) — this read
      // path only ever uses activeAccount.id below, never the 8 platform-
      // account includes/analytics history the heavy version loads. See
      // social-account.repository.js's findByIdLite() doc comment.
      const account = await require('../../../repositories/social/social-account.repository').findByBrandAndPlatformLite(brandId, PLATFORMS.THREADS);
      if (!account || account.length === 0) {
        return { data: [], nextPageToken: null, prevPageToken: null };
      }

      // socialAccountId picks a specific Threads account when the brand has
      // more than one connected; omitted, falls back to the first one
      // (correct as long as the brand only has one, still the common case).
      const activeAccount = (socialAccountId && account.find(acc => acc.id === socialAccountId)) || account[0];

      const rows = await findLatestPostMetrics(brandId, PLATFORMS.THREADS, activeAccount.id, limit, startDate, endDate);
      const data = rows.map(r => this._formatDbMetricRow(r));
      return { data, nextPageToken: null, prevPageToken: null };
    } catch (error) {
      console.error('Threads getPublishedVideos error:', error);
      return {
        data: [],
        nextPageToken: null,
        prevPageToken: null
      };
    }
  }

  /**
   * Sync-only: the ONE place allowed to call Threads' live API for
   * published posts. Called from posts-sync-scheduler.service.js's cron
   * webhook, connectChannel's OAuth-time backfill, and the manual-refresh
   * endpoint — never from a read path.
   */
  async syncPublishedPosts(brandId, socialAccountId) {
    // findById looks up by raw ID with no brand scoping — a caller-supplied
    // socialAccountId could belong to a different brand than the one the
    // caller is authorized for, so verify ownership explicitly (IDOR guard),
    // same as facebook-post.service.js#_getAccountCredentials.
    const account = await require('../../../repositories/social/social-account.repository').findById(socialAccountId);
    if (!account || String(account.brandId) !== String(brandId)) return { synced: 0 };

    const pageId = account.platformAccountId;
    const accessToken = account.accessToken;
    if (accessToken && accessToken.startsWith('mock-')) {
      return { synced: 0 };
    }

    const windowMonths = await getHistoryWindowMonths(brandId);
    const result = await this._fetchThreadsRecentWindow(brandId, pageId, accessToken, windowMonths, 50);
    await this._persistThreadsPostMetrics(brandId, socialAccountId, result.data);
    return { synced: result.data.length };
  }

  _formatThreadsPost(post) {
    const reactions = post.like_count || 0;
    const comments = post.reply_count || 0;
    const shares = (post.repost_count || 0) + (post.quote_count || 0);
    const clicks = 0;
    const views = post.views !== undefined ? post.views : null;
    const reach = post.reach !== undefined ? post.reach : views;

    let mediaUrl = post.thumbnail_url || post.media_url || '';
    if (!mediaUrl && post.children && Array.isArray(post.children.data) && post.children.data.length > 0) {
      const firstChild = post.children.data[0];
      mediaUrl = firstChild.thumbnail_url || firstChild.media_url || '';
    }

    const engagement = (views && views > 0)
      ? parseFloat((((reactions + comments + shares) / views) * 100).toFixed(1))
      : (post.engagement !== undefined ? post.engagement : null);

    const postUrl = post.permalink || (post.id ? `https://www.threads.net/post/${post.id}` : null);

    return {
      id: post.id,
      message: post.text || '',
      type: post.media_type || THREADS_MEDIA_TYPE.TEXT,
      mediaUrl,
      postUrl,
      permalinkUrl: postUrl,
      date: post.timestamp,
      status: 'PUBLISHED',
      reach,
      views,
      reactions,
      comments,
      shares,
      clicks,
      engagement,
      commentScore: computeCommentScore({ comments, likes: reactions, shares, reach })
    };
  }

  async _enrichPostsWithInsights(posts, accessToken) {
    if (!accessToken || !Array.isArray(posts) || posts.length === 0) return posts;

    await Promise.allSettled(
      posts.map(async (post) => {
        try {
          const insightsRes = await threadsGateway.getMediaInsights(post.id, accessToken, ['views']);
          if (insightsRes && Array.isArray(insightsRes.data)) {
            const viewsMetric = insightsRes.data.find(m => m.name === 'views');
            if (viewsMetric && Array.isArray(viewsMetric.values) && viewsMetric.values.length > 0) {
              const views = parseInt(viewsMetric.values[0].value || 0, 10);
              post.views = views;
              post.reach = views;
              if (views > 0) {
                post.engagement = parseFloat((((post.reactions + post.comments + post.shares) / views) * 100).toFixed(1));
              }
            }
          }
        } catch (err) {
          // Insights fail gracefully if token/permission missing
        }
      })
    );
    return posts;
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

      const cutoffIndex = feed.findIndex(p => p.timestamp && new Date(p.timestamp) < recentCutoff);
      const pageFeed = cutoffIndex === -1 ? feed : feed.slice(0, cutoffIndex);
      const formatted = pageFeed.map(post => this._formatThreadsPost(post));
      const enriched = await this._enrichPostsWithInsights(formatted, accessToken);
      posts = posts.concat(enriched);

      if (cutoffIndex === -1) {
        hasMore = Boolean(feedResult.nextPageToken);
        pageToken = feedResult.nextPageToken || null;
      } else {
        hasMore = false;
      }
    }

    return { data: posts, nextPageToken: null, prevPageToken: null };
  }

  /** Builds getPublishedVideos()'s response shape from a PostMetricDaily
   * row — clicks isn't a typed column, so it lives in `metrics` JSON. */
  // reach/views/engagement stay null (never fabricated from likes*N) when
  // Threads' API genuinely has no data for them — see #97.
  _formatDbMetricRow(row) {
    const m = row.metrics || {};
    const clicks = m.clicks || 0;
    const postUrl = row.postUrl || (row.platformPostId ? `https://www.threads.net/post/${row.platformPostId}` : null);
    const views = row.views ?? null;
    return {
      id: row.platformPostId,
      message: row.captionSnippet || '',
      type: row.postType || THREADS_MEDIA_TYPE.TEXT,
      mediaUrl: row.thumbnailUrl || '',
      postUrl,
      permalinkUrl: postUrl,
      date: row.publishedAt,
      status: 'PUBLISHED',
      reach: row.reach ?? views,
      views,
      reactions: row.likes || 0,
      comments: row.comments || 0,
      shares: row.shares || 0,
      clicks,
      engagement: m.engagementRate ?? null,
      commentScore: computeCommentScore({ comments: row.comments || 0, likes: row.likes || 0, shares: row.shares || 0, reach: row.reach || views || 0 })
    };
  }

  /** Sync-only: upserts the freshly-fetched page(s) of posts into
   * PostMetricDaily so the next getPublishedVideos call can be DB-only. */
  async _persistThreadsPostMetrics(brandId, socialAccountId, posts) {
    const rows = posts.map(post => ({
      platformPostId: post.id,
      postType: post.type || null,
      publishedAt: post.date ? new Date(post.date) : null,
      likes: post.reactions || 0,
      comments: post.comments || 0,
      shares: post.shares || 0,
      reach: post.reach ?? null,
      views: post.views ?? null,
      captionSnippet: post.message || null,
      thumbnailUrl: post.mediaUrl || null,
      postUrl: post.postUrl || null,
      metrics: {
        clicks: post.clicks || 0,
        engagementRate: post.engagement ?? null
      }
    }));

    await upsertPostMetricsDaily(brandId, socialAccountId, PLATFORMS.THREADS, rows);
  }

  async publishPost(brandId, postData) {
    // Short-circuit like YouTube/Instagram: platformPostId is only ever set
    // once SocialPublishStep sees a prior successful result for this
    // (platform, account) pair. Without this check, retrying a post whose
    // OTHER platforms failed (e.g. ListView's "Repost" button, which retries
    // every target platform since most gateways already short-circuit — see
    // its own comment) re-ran the entire thread chain from scratch: a fresh
    // previousPostId=null meant every post in the chain was recreated as a
    // new, disconnected root post instead of resuming/skipping the existing
    // thread, duplicating content on Threads with no reply links between them.
    if (postData.platformPostId) {
      logger.debug(`[Threads] Already published. ID: ${postData.platformPostId}`);
      return {
        success: true,
        platformVideoId: postData.platformPostId,
        publishedAt: new Date()
      };
    }

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

        let mediaType = THREADS_MEDIA_TYPE.TEXT;
        if (mediaUrl) {
          const isVideo = ['.mp4', '.mov', '.avi', '.mkv'].some(ext => mediaUrl.toLowerCase().endsWith(ext));
          mediaType = isVideo ? THREADS_MEDIA_TYPE.VIDEO : THREADS_MEDIA_TYPE.IMAGE;
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

        // Poll every container (not just media ones) before publishing.
        // A TEXT container used to skip this entirely and publish
        // immediately — fine for a lone/root post, but a TEXT reply
        // (reply_to_id set) created right after the parent it's replying to
        // was just published intermittently failed with "The requested
        // resource does not exist" / "Không tìm thấy file phương tiện":
        // Meta's own createMediaContainer response is not a guarantee the
        // container has finished propagating server-side yet, and a fast
        // reply chain (3+ posts published back-to-back) hits that window far
        // more often than a single post ever would. Meta's own Threads API
        // docs recommend checking status before publish for exactly this
        // reason — this now does so unconditionally instead of gating on
        // mediaType, at the cost of a few extra ~1s polls for plain text.
        const isTextContainer = mediaType === THREADS_MEDIA_TYPE.TEXT;
        const maxAttempts = isTextContainer ? 10 : 60;
        const intervalMs = isTextContainer ? 1000 : 5000;
        let isReady = false;

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
          const statusData = await threadsGateway.getContainerStatus(account.accessToken, container.id);
          const status = statusData.status;
          logger.debug(`[Threads Polling] Attempt ${attempt}/${maxAttempts} | Container: ${container.id} | Status: ${status}`);

          if (status === THREADS_CONTAINER_STATUS.FINISHED) {
            isReady = true;
            break;
          }
          if (status === THREADS_CONTAINER_STATUS.ERROR) {
            throw new Error(statusData.error_message || 'Threads media processing failed');
          }
          await new Promise(resolve => setTimeout(resolve, intervalMs));
        }

        if (!isReady) {
          throw new Error('Timeout waiting for Threads container to be processed');
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

      // Fetch exact permalink from Threads Graph API
      let permalink = null;
      try {
        const mediaDetails = await threadsGateway.getMediaDetails(rootPostId, account.accessToken);
        if (mediaDetails?.permalink) {
          permalink = mediaDetails.permalink;
          logger.debug(`[Threads] Fetched official permalink: ${permalink}`);
        }
      } catch (detailsErr) {
        logger.warn(`[Threads] Could not fetch permalink for ${rootPostId}: ${detailsErr.message}`);
      }

      return {
        success: true,
        platformVideoId: rootPostId,
        permalink: permalink,
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
  // --- Template Method Hook Implementations ---
  async buildPlatformClient(account) {
    return {
      threadsUserId: account.threadsAccount?.threadsUserId || account.platformAccountId,
      accessToken: account.accessToken
    };
  }

  async fetchRawPlatformData(client, options = {}) {
    const { limit = 10, pageToken = null, socialAccountId = null } = options;
    return await this.getPublishedVideos(options.brandId, pageToken, limit, socialAccountId);
  }

  normalizePlatformData(rawData, options = {}) {
    return Array.isArray(rawData) ? rawData : (rawData?.posts || rawData?.videos || rawData?.data || []);
  }
}

module.exports = new ThreadsService();
