const facebookGateway = require('./facebook.gateway');
const facebookReelGateway = require('./facebook-reel.gateway');
const logger = require('../../../utils/logger');

// Same 3-tier metric names getPostInsights() tries in order — Facebook has
// renamed these metrics across API versions (post_impressions_unique* is
// the newest name at the time of writing, the others are older aliases
// some pages/posts still respond to) and not every page supports every
// name yet. Kept as an ordered list so the batch path can try tier 1 first
// and only fall back for whichever posts' tier-1 sub-request actually
// errored, instead of always paying for all 3 tiers per post.
const STANDARD_METRIC_TIERS = [
  'post_impressions_unique,post_impressions,post_clicks_by_type',
  'post_total_media_view_unique,post_media_view,post_clicks_by_type',
  'post_impressions_unique,post_impressions'
];

const INSIGHTS_STRATEGIES = {
  REEL: async (platformPostId, pageAccessToken) => {
    try {
      const insights = await facebookReelGateway.getReelVideoInsights(platformPostId, pageAccessToken);
      const metrics = { reach: 0, views: 0, clicks: 0, linkClicks: 0 };
      if (insights && insights.data) {
        for (const item of insights.data) {
          if (item.name === 'blue_reels_play_count') {
            metrics.views = item.values?.[0]?.value || 0;
            metrics.reach = metrics.views;
          }
        }
      }
      return metrics;
    } catch (err) {
      console.warn(`[FacebookPostService] Failed to fetch Reel insights for ${platformPostId}:`, err.message);
      return { reach: 0, views: 0, clicks: 0, linkClicks: 0 };
    }
  },
  STANDARD: async (platformPostId, pageAccessToken) => {
    const insights = await facebookGateway.getPostInsights(platformPostId, pageAccessToken);
    const result = { reach: 0, views: 0, clicks: 0, linkClicks: 0 };
    for (const item of insights) {
      if (item.name === 'post_total_media_view_unique' || item.name === 'post_impressions_unique') {
        result.reach = item.values?.[0]?.value || 0;
      } else if (item.name === 'post_media_view' || item.name === 'post_impressions') {
        result.views = item.values?.[0]?.value || 0;
      } else if (item.name === 'post_clicks_by_type') {
        const types = item.values?.[0]?.value || {};
        result.clicks = Object.values(types).reduce((sum, val) => sum + val, 0);
        result.linkClicks = types['link clicks'] || 0;
      }
    }
    if (!result.reach && result.views) result.reach = result.views;
    if (!result.views && result.reach) result.views = result.reach;
    return result;
  }
};
const socialAccountRepository = require('../../../repositories/social/social-account.repository');
const brandRepository = require('../../../repositories/workspace/brand.repository');
const { PLATFORMS, POST_STATUS, POST_TYPES, DEFAULT_CONFIG, SOCIAL_TECHNICAL } = require('../../../utils/constants');
const FacebookPublishStrategyFactory = require('./publish-strategies/publish-strategy.factory');
const redisClient = require('../../../config/redis');
const prisma = require('../../../config/prisma');
const DistributedLockService = require('../distributed-lock.service');

// Fallback when a brand has no active subscription — same conservative
// (FREE-tier) default used by TikTokVideoService/InstagramPostService.
const DEFAULT_HISTORY_WINDOW_MONTHS = 1;

const POST_INSIGHTS_CACHE_TTL_SEC = 5 * 60; // 5 minutes
// getVideoDetails() read-through cache: Inbox preview was calling the Graph
// API on every click, including once per top-level comment sharing the same
// post (N+1) — same bug class already fixed for YouTube via TrackedVideo.
// title/thumbnail don't need to be fresher than this.
const VIDEO_DETAILS_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
// getPublishedPosts()'s DB-first cache (see FacebookPostMetric). Facebook's
// own docs say most post-insights metrics only refresh once every 24h
// (developers.facebook.com/docs/graph-api/reference/insights) — re-fetching
// live more often than that cannot return newer numbers for most metrics,
// so a live re-fetch is only worth its BUC quota cost once/day.
const FACEBOOK_POST_METRICS_TTL_MS = 24 * 60 * 60 * 1000;
const PAGE_DEMOGRAPHICS_CACHE_TTL_SEC = 60 * 60; // 1 hour

const COLD_START_POLL_INTERVAL_MS = 200;
const COLD_START_POLL_TIMEOUT_MS = 2000;
const COLD_START_RETRY_AFTER_SEC = 5;

const lockService = new DistributedLockService(redisClient);

// Memory Cache: Key -> brandId_limit, Value -> { data, expiry }
const postCache = new Map();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

class FacebookPostService {
  _withTimeout(promise, ms, fallback) {
    let timeoutId;
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error(`Timeout of ${ms}ms exceeded`));
      }, ms);
    });
    return Promise.race([promise, timeoutPromise])
      .catch(err => {
        console.warn(`[FacebookPostService] API call failed or timed out: ${err.message}. Using fallback.`);
        return fallback;
      })
      .finally(() => {
        clearTimeout(timeoutId);
      });
  }

  async getPublishedPosts(brandId, pageToken = null, limit = 10, socialAccountId = null, startDate = null, endDate = null) {
    const cacheKey = `${brandId}_${pageToken || 'first'}_${limit}_${socialAccountId || 'default'}_${startDate || ''}_${endDate || ''}`;
    const cached = postCache.get(cacheKey);
    if (cached && cached.expiry > Date.now()) return cached.data;

    try {
      const { pageId, pageAccessToken, socialAccountId: resolvedAccountId } = await this._getAccountCredentials(brandId, socialAccountId);

      if ((pageAccessToken && pageAccessToken.startsWith('mock-')) || (pageId && pageId.startsWith('mock-')) || pageId === 'fb-page-mock') {
        return { data: [], nextPageToken: null, prevPageToken: null };
      }

      // The initial load (no explicit pageToken) is DB-first: Facebook's own
      // docs say most post-insights metrics only update once every 24h, so
      // re-fetching live every time a user opens the tab burns BUC quota for
      // numbers that provably haven't changed (see FACEBOOK_POST_METRICS
      // cache TTL). Only when the DB has nothing fresh enough for the
      // brand's plan window does this fall through to the live Batch
      // Request walk, same as before. An explicit pageToken (manual "next
      // page" click) always goes live — DB-first is only for the default view.
      let result;
      if (pageToken) {
        result = await this._fetchSinglePage(pageId, pageAccessToken, pageToken, limit);
      } else {
        const windowMonths = await this._getHistoryWindowMonths(brandId);
        result = await this._fetchFromDbCache(brandId, resolvedAccountId, windowMonths);
        if (!result) {
          result = await this._fetchRecentWindow(brandId, pageId, pageAccessToken, limit);
          this._persistPostMetrics(brandId, resolvedAccountId, result.data).catch(err => {
            console.warn('[FacebookPostService] Failed to persist post metrics cache:', err.message);
          });
        }
      }

      result = { ...result, data: this._filterByDateRange(result.data, startDate, endDate) };

      postCache.set(cacheKey, { data: result, expiry: Date.now() + CACHE_TTL_MS });
      return result;
    } catch (error) {
      if (error.message.includes('Facebook account not connected')) {
        return { data: [], nextPageToken: null, prevPageToken: null };
      }
      throw error;
    }
  }

  // Applied after the DB-first/live fetch resolves, on top of the plan's
  // historyWindowMonths — this is a display-only narrowing (the caller
  // picked a shorter range in the UI's date picker) and never widens what
  // the plan already fetched/cached.
  _filterByDateRange(posts, startDate, endDate) {
    if (!startDate && !endDate) return posts;
    return (posts || []).filter((post) => {
      if (!post.date) return true;
      const postTime = new Date(post.date).getTime();
      if (startDate && postTime < new Date(startDate).getTime()) return false;
      if (endDate && postTime > new Date(endDate).getTime() + 24 * 60 * 60 * 1000 - 1) return false;
      return true;
    });
  }

  /**
   * DB-first read path (see FacebookPostMetric in schema.prisma) — returns
   * null (cache miss, caller falls through to a live fetch) unless the
   * NEWEST row for this account is fresher than FACEBOOK_POST_METRICS_TTL_MS.
   * Using only the newest row's freshness (not every row's) means a page
   * that hasn't published anything new keeps serving cache indefinitely
   * once it's been fetched live once — correct, since "no new posts" is
   * itself accurately reflected by the cache.
   */
  async _fetchFromDbCache(brandId, socialAccountId, windowMonths) {
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - windowMonths);

    const rows = await prisma.facebookPostMetric.findMany({
      where: { brandId, socialAccountId, publishedAt: { gte: cutoff } },
      orderBy: { publishedAt: 'desc' }
    });
    if (rows.length === 0) return null;

    const newestFetch = rows.reduce((max, r) => (r.fetchedAt > max ? r.fetchedAt : max), rows[0].fetchedAt);
    if (Date.now() - newestFetch.getTime() >= FACEBOOK_POST_METRICS_TTL_MS) return null;

    return {
      data: rows.map(r => this._formatDbMetricRow(r)),
      nextPageToken: null,
      prevPageToken: null
    };
  }

  _formatDbMetricRow(row) {
    const reach = row.reach || row.videoViews || 0;
    const views = row.videoViews || row.reach || 0;
    return {
      id: row.platformPostId,
      message: row.captionSnippet || DEFAULT_CONFIG.NO_CONTENT,
      type: row.postType,
      platform: 'facebook',
      mediaUrl: row.thumbnailUrl || '',
      postUrl: `https://www.facebook.com/${row.platformPostId}`,
      date: row.publishedAt,
      status: POST_STATUS.PUBLISHED,
      reach,
      views,
      reactions: row.reactions,
      comments: row.comments,
      shares: row.shares,
      clicks: row.linkClicks + row.otherClicks,
      linkClicks: row.linkClicks,
      videoViews: row.videoViews,
      videoTimeWatched: row.avgWatchTimeSeconds ? `${Math.round(row.avgWatchTimeSeconds / 60)}:${String(Math.round(row.avgWatchTimeSeconds % 60)).padStart(2, '0')}` : '0:00',
      engagement: row.engagementRate,
      spent: 0
    };
  }

  /** Upserts the freshly-enriched page(s) of posts into FacebookPostMetric
   * so the next getPublishedPosts call for this brand/account can be
   * DB-first instead of hitting the live Graph API again. Best-effort —
   * caller doesn't await this on the response path. */
  async _persistPostMetrics(brandId, socialAccountId, posts) {
    for (const post of posts) {
      const postType = post.type === 'REEL' ? 'REEL' : (post.type || 'IMAGE');
      await prisma.facebookPostMetric.upsert({
        where: { socialAccountId_platformPostId: { socialAccountId, platformPostId: post.id } },
        create: {
          brandId,
          socialAccountId,
          platformPostId: post.id,
          postType,
          publishedAt: post.date ? new Date(post.date) : null,
          reach: post.reach || 0,
          impressions: post.views || 0,
          videoViews: post.videoViews || 0,
          avgWatchTimeSeconds: null,
          likes: post.reactions || 0,
          comments: post.comments || 0,
          shares: post.shares || 0,
          reactions: post.reactions || 0,
          linkClicks: post.linkClicks || 0,
          otherClicks: Math.max((post.clicks || 0) - (post.linkClicks || 0), 0),
          engagementRate: post.engagement || 0,
          captionSnippet: post.message || null,
          thumbnailUrl: post.mediaUrl || null
        },
        update: {
          postType,
          publishedAt: post.date ? new Date(post.date) : null,
          reach: post.reach || 0,
          impressions: post.views || 0,
          videoViews: post.videoViews || 0,
          likes: post.reactions || 0,
          comments: post.comments || 0,
          shares: post.shares || 0,
          reactions: post.reactions || 0,
          linkClicks: post.linkClicks || 0,
          otherClicks: Math.max((post.clicks || 0) - (post.linkClicks || 0), 0),
          engagementRate: post.engagement || 0,
          captionSnippet: post.message || null,
          thumbnailUrl: post.mediaUrl || null,
          fetchedAt: new Date()
        }
      }).catch(err => {
        console.warn(`[FacebookPostService] Failed to upsert metrics for post ${post.id}:`, err.message);
      });
    }
  }

  async _fetchSinglePage(pageId, pageAccessToken, pageToken, limit) {
    const feedResult = await this._withTimeout(
      facebookGateway.getPageFeed(pageId, pageAccessToken, pageToken, limit),
      4000,
      { data: [], nextPageToken: null, prevPageToken: null }
    );

    const feed = feedResult.data || [];
    const postsWithInsights = await this._enrichPostsWithInsightsBatch(feed, pageAccessToken);

    return {
      data: postsWithInsights,
      nextPageToken: feedResult.nextPageToken || null,
      prevPageToken: feedResult.prevPageToken || null
    };
  }

  /** Walks pages from the start, stopping at whichever comes first: a post
   * older than the brand's plan-based history window, or MAX_PAGE_COUNT.
   * Kept lower than TikTok's page cap since every Facebook post still costs
   * 2 sub-requests each (insights + reactions) even when batched — batching
   * cuts round-trips, not the per-post BUC quota cost
   * (developers.facebook.com/docs/graph-api/overview/rate-limiting/). */
  async _fetchRecentWindow(brandId, pageId, pageAccessToken, limit) {
    const MAX_PAGE_COUNT = 5;
    const windowMonths = await this._getHistoryWindowMonths(brandId);
    const recentCutoff = new Date();
    recentCutoff.setMonth(recentCutoff.getMonth() - windowMonths);

    let pageToken = null;
    let posts = [];
    let hasMore = true;
    let pageCount = 0;

    while (hasMore && pageCount < MAX_PAGE_COUNT) {
      pageCount += 1;
      const feedResult = await this._withTimeout(
        facebookGateway.getPageFeed(pageId, pageAccessToken, pageToken, limit),
        4000,
        { data: [], nextPageToken: null, prevPageToken: null }
      );
      const feed = feedResult.data || [];
      if (feed.length === 0) break;

      // Facebook returns posts newest-first, so once one post in a page is
      // older than the cutoff, every post after it (this page and all
      // subsequent pages) is guaranteed older too — safe to stop instead of
      // walking the rest of the Page's history.
      const cutoffIndex = feed.findIndex(p => p.created_time && new Date(p.created_time) < recentCutoff);
      const pageFeed = cutoffIndex === -1 ? feed : feed.slice(0, cutoffIndex);

      const enriched = await this._enrichPostsWithInsightsBatch(pageFeed, pageAccessToken);
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

  async _getHistoryWindowMonths(brandId) {
    const brand = await brandRepository.findBrandWithSubscription(brandId);
    const planLimit = brand?.subscription?.status === 'ACTIVE' ? brand.subscription.plan?.planLimit : null;
    return planLimit?.historyWindowMonths || DEFAULT_HISTORY_WINDOW_MONTHS;
  }
  async publishPost(brandId, postData) {
    const { platformPostId, scheduledAt, type, mediaUrls = [], socialAccountId } = postData;
    logger.debug(`\n[Facebook] ▶ publishPost | brandId=${brandId} | type=${type} | mediaUrls=${JSON.stringify(mediaUrls)}`);

    // Short-circuit
    if (platformPostId) {
      logger.debug(`[Facebook] Short-circuiting. Post already scheduled with ID: ${platformPostId}`);
      return { platformVideoId: platformPostId, publishedAt: null };
    }

    const { pageId, pageAccessToken } = await this._getAccountCredentials(brandId, socialAccountId);
    logger.debug(`[Facebook] Credentials OK | pageId=${pageId} | tokenPrefix=${pageAccessToken?.substring(0, 10)}...`);

    if (pageAccessToken && (pageAccessToken.startsWith('mock-') || pageAccessToken.includes('mock') || pageAccessToken.startsWith('fb_mock'))) {
      logger.debug(`[Facebook] Mock publishing detected for mock token. Returning simulated success.`);
      return {
        platformVideoId: `mock-fb-post-${Date.now()}`,
        publishedAt: scheduledAt ? null : new Date()
      };
    }

    const mediaUrl = mediaUrls && mediaUrls.length > 0 ? mediaUrls[0] : null;

    // Check if we can use native scheduling
    let finalScheduledAt = null;
    if (scheduledAt) {
      const diffMs = new Date(scheduledAt).getTime() - Date.now();
      // Meta requires 10 minutes to 75 days.
      const isTimeValid = diffMs >= 10 * 60 * 1000 && diffMs <= 75 * 24 * 60 * 60 * 1000;
      const isTypeSupported = type !== POST_TYPES.STORY && type !== POST_TYPES.REEL; // Reels / Stories are queue-based

      if (isTimeValid && isTypeSupported) {
        finalScheduledAt = scheduledAt;
        logger.debug(`[Facebook] Using Native Scheduling for scheduledAt: ${scheduledAt}`);
      } else {
        logger.debug(`[Facebook] Falling back to Queue-based scheduling. isTimeValid: ${isTimeValid}, isTypeSupported: ${isTypeSupported}`);
      }
    }

    const strategy = FacebookPublishStrategyFactory.getStrategy(type, mediaUrl);
    logger.debug(`[Facebook] Strategy selected: ${strategy.constructor.name} | mediaUrl=${mediaUrl}`);

    try {
      const result = await strategy.publish(pageId, pageAccessToken, { 
        ...postData, 
        mediaUrl, 
        mediaUrls,
        scheduledAt: finalScheduledAt
      });
      logger.debug(`[Facebook] ✅ Published successfully! platformPostId=${result.id}`);

      // Post First Comment if published immediately
      if (!finalScheduledAt && postData.options?.firstComment?.trim()) {
        try {
          logger.debug(`[Facebook] Posting first comment: "${postData.options.firstComment.trim()}"`);
          await facebookGateway.createComment(result.id, postData.options.firstComment.trim(), pageAccessToken);
          logger.debug(`[Facebook] First comment posted successfully.`);
        } catch (commentErr) {
          console.error(`[Facebook] Failed to post first comment:`, commentErr.message);
        }
      }

      return { 
        platformVideoId: result.id, 
        publishedAt: finalScheduledAt ? null : new Date() 
      };
    } catch (err) {
      console.error(`[Facebook] ❌ Publish FAILED:`, err.message);
      if (err.response?.data) {
        console.error(`[Facebook] API Error Detail:`, JSON.stringify(err.response.data));
      }
      throw err;
    }
  }

  async updatePost(brandId, platformPostId, postData) {
    const { pageAccessToken } = await this._getAccountCredentials(brandId);
    
    if (pageAccessToken && pageAccessToken.startsWith('mock-')) {
      return { success: true, mock: true };
    }

    const { caption } = postData;
    return await facebookGateway.updatePostMessage(platformPostId, caption || '', pageAccessToken);
  }

  async deletePost(brandId, platformPostId, socialAccountId = null) {
    const { pageAccessToken } = await this._getAccountCredentials(brandId, socialAccountId);

    if (pageAccessToken && pageAccessToken.startsWith('mock-')) {
      return { success: true, mock: true };
    }

    return await facebookGateway.deletePost(platformPostId, pageAccessToken);
  }

  async checkReelCopyrightStatus(brandId, videoId, socialAccountId = null) {
    const { pageAccessToken } = await this._getAccountCredentials(brandId, socialAccountId);
    if (pageAccessToken && (pageAccessToken.startsWith('mock-') || pageAccessToken.includes('mock'))) {
      return {
        copyright_check_information: {
          status: {
            status: 'complete',
            matches_found: false
          }
        }
      };
    }
    return facebookReelGateway.checkReelCopyrightStatus(videoId, pageAccessToken);
  }

  /**
   * Lấy chi tiết phân tích 1 bài viết Facebook (Overview + Reactions breakdown + Demographics).
   * Kiểm tra Redis Cache trước (fb:post-insights:${brandId}:${platformPostId}, TTL 5 phút).
   */
  async getPostDetails(brandId, platformPostId, socialAccountId = null) {
    const cacheKey = `fb:post-insights:${brandId}:${platformPostId}`;
    const cached = await redisClient.get(cacheKey).catch(() => null);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {
        // fall through to refetch on corrupt cache entry
      }
    }

    const { pageId, pageAccessToken } = await this._getAccountCredentials(brandId, socialAccountId);

    let result;
    if (pageAccessToken && pageAccessToken.startsWith('mock-')) {
      result = this._buildMockPostDetails(platformPostId);
    } else {
      try {
        const dbPost = await prisma.post.findFirst({
          where: { platformPostId: platformPostId }
        }).catch(() => null);

        const isReel = dbPost?.type === 'REEL' || dbPost?.options?.facebookType === 'reel';
        const strategy = isReel ? INSIGHTS_STRATEGIES.REEL : INSIGHTS_STRATEGIES.STANDARD;

        const results = await Promise.allSettled([
          facebookGateway.getPostDetails(platformPostId, pageAccessToken),
          strategy(platformPostId, pageAccessToken),
          facebookGateway.getPostReactionsBreakdown(platformPostId, pageAccessToken)
        ]);

        const postResult = results[0].status === 'fulfilled' ? results[0].value : null;
        const insightsResult = results[1].status === 'fulfilled' ? results[1].value : { reach: 0, views: 0, clicks: 0, linkClicks: 0 };
        const reactionsResult = results[2].status === 'fulfilled' ? results[2].value : { total: 0, breakdown: {} };

        const postDetails = postResult ? {
          id: postResult.id,
          message: postResult.message || postResult.story || DEFAULT_CONFIG.NO_CONTENT,
          type: isReel ? POST_TYPES.REEL : this._determinePostType(postResult),
          mediaUrl: postResult.full_picture || '',
          permalinkUrl: postResult.permalink_url || null,
          date: postResult.created_time,
          platform: 'facebook'
        } : {
          id: platformPostId,
          message: dbPost?.caption || DEFAULT_CONFIG.NO_CONTENT,
          type: isReel ? POST_TYPES.REEL : POST_TYPES.IMAGE,
          mediaUrl: dbPost?.mediaUrls?.[0] || '',
          permalinkUrl: `https://www.facebook.com/${platformPostId}`,
          date: dbPost?.createdAt || new Date(),
          platform: 'facebook'
        };

        const counts = postResult ? this._extractPostCounts(postResult) : { comments: 0, reactions: 0, shares: 0 };
        const demographics = await this._getPageDemographicsCached(brandId, pageId, pageAccessToken).catch(() => ({ ageGender: null, geography: null }));

        result = {
          postDetails,
          reach: insightsResult.reach || 0,
          views: insightsResult.views || 0,
          clicks: insightsResult.clicks || 0,
          linkClicks: insightsResult.linkClicks || 0,
          comments: counts.comments,
          shares: counts.shares,
          reactions: {
            total: counts.reactions || reactionsResult.total || 0,
            breakdown: reactionsResult.breakdown || reactionsResult
          },
          demographics: demographics?.ageGender || null,
          geography: demographics?.geography || null
        };
      } catch (err) {
        console.warn(`[FacebookPostService] getPostDetails failed for post ${platformPostId} (brand ${brandId}): ${err.message}`);
        throw err;
      }
    }

    await redisClient.setEx(cacheKey, POST_INSIGHTS_CACHE_TTL_SEC, JSON.stringify(result)).catch(() => {});
    return result;
  }

  /**
   * Lightweight post lookup for inbox thread headers (title/thumbnail/real
   * Facebook permalink) — unlike getPostDetails/getPostAnalytics this makes
   * a single Graph API call with no insights/reactions/caching, since the
   * inbox thread view only needs enough to render a header and a working
   * "view on Facebook" link, not analytics.
   */
  async getVideoDetails(brandId, platformPostId, socialAccountId = null) {
    const cached = await prisma.facebookPostMetric.findFirst({
      where: { brandId, platformPostId }
    });
    if (cached && Date.now() - cached.fetchedAt.getTime() < VIDEO_DETAILS_CACHE_TTL_MS) {
      return {
        id: platformPostId,
        title: (cached.captionSnippet || 'Facebook Post').slice(0, 60),
        thumbnailUrl: cached.thumbnailUrl || null,
        channelTitle: 'Facebook',
        postUrl: `https://www.facebook.com/${platformPostId}`
      };
    }

    const { pageAccessToken } = await this._getAccountCredentials(brandId, socialAccountId);
    if (pageAccessToken && pageAccessToken.startsWith('mock-')) {
      return {
        id: platformPostId,
        title: 'Facebook Post',
        thumbnailUrl: null,
        channelTitle: 'Facebook',
        postUrl: `https://www.facebook.com/${platformPostId}`
      };
    }

    const post = await facebookGateway.getPostDetails(platformPostId, pageAccessToken);
    return {
      id: post.id,
      title: (post.message || post.story || 'Facebook Post').slice(0, 60),
      thumbnailUrl: post.full_picture || null,
      channelTitle: 'Facebook',
      postUrl: post.permalink_url || `https://www.facebook.com/${platformPostId}`
    };
  }

  async _getPageDemographicsCached(brandId, pageId, pageAccessToken) {
    const cacheKey = `fb:page-demographics:${brandId}`;
    const cached = await redisClient.get(cacheKey).catch(() => null);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {
        // fall through to refetch on corrupt cache entry
      }
    }

    const demographics = await facebookGateway.getPageDemographics(pageId, pageAccessToken);
    await redisClient.setEx(cacheKey, PAGE_DEMOGRAPHICS_CACHE_TTL_SEC, JSON.stringify(demographics)).catch(() => {});
    return demographics;
  }

  _buildMockPostDetails(platformPostId) {
    return {
      postDetails: {
        id: platformPostId,
        message: 'Bài viết mẫu Facebook (Mock)',
        type: POST_TYPES.IMAGE,
        mediaUrl: '',
        permalinkUrl: `https://www.facebook.com/${platformPostId}`,
        date: new Date().toISOString(),
        platform: 'facebook'
      },
      reach: 1200,
      views: 1800,
      clicks: 45,
      linkClicks: 20,
      comments: 8,
      shares: 3,
      reactions: {
        total: 56,
        breakdown: { LIKE: 40, LOVE: 10, HAHA: 3, WOW: 2, SAD: 1, ANGRY: 0 }
      },
      demographics: { available: false, reason: 'deprecated_by_platform', data: null },
      geography: { available: true, reason: null, data: { 'Vietnam': 820, 'United States': 210 } }
    };
  }



  // ============= Private Helper Methods =============

  async _getAccountCredentials(brandId, socialAccountId = null) {
    let account;
    if (socialAccountId) {
      // findById looks up by raw ID with no brand scoping — unlike the
      // findByBrandAndPlatform branch below (which already filters by
      // brandId at the query level), a caller-supplied socialAccountId
      // could belong to a different brand than the one the caller is
      // authorized for, so verify ownership explicitly (IDOR guard).
      account = await socialAccountRepository.findById(socialAccountId);
      if (!account || (brandId && String(account.brandId) !== String(brandId))) {
        throw new Error('Facebook account not connected for this brand');
      }
    } else {
      const socialAccount = await socialAccountRepository.findByBrandAndPlatform(brandId, PLATFORMS.FACEBOOK);
      if (!socialAccount || socialAccount.length === 0) {
        throw new Error('Facebook account not connected for this brand');
      }
      account = socialAccount[0];
    }

    if (!account) {
      throw new Error('Facebook account not connected for this brand');
    }

    return {
      pageId: account.platformAccountId,
      pageAccessToken: account.accessToken,
      socialAccountId: account.id
    };
  }

  async _enrichPostWithInsights(post, pageAccessToken) {
    try {
      const dbPost = await prisma.post.findFirst({
        where: { platformPostId: post.id }
      }).catch(() => null);

      const isReel = dbPost?.type === 'REEL' || dbPost?.options?.facebookType === 'reel';
      const strategy = isReel ? INSIGHTS_STRATEGIES.REEL : INSIGHTS_STRATEGIES.STANDARD;

      const insightsResult = await this._withTimeout(
        strategy(post.id, pageAccessToken),
        1500,
        { reach: 0, views: 0, clicks: 0, linkClicks: 0 }
      );

      const reactionsBreakdownResult = await this._withTimeout(
        facebookGateway.getPostReactionsBreakdown(post.id, pageAccessToken),
        1500,
        { total: 0, breakdown: {} }
      );

      const counts = this._extractPostCounts(post);
      const postType = isReel ? 'REEL' : this._determinePostType(post);

      const reach = insightsResult.reach || insightsResult.views || 0;
      const views = insightsResult.views || insightsResult.reach || 0;
      const clicks = insightsResult.clicks || 0;
      const baseCount = reach || views;
      const engagement = baseCount ? parseFloat((((counts.reactions + counts.comments + counts.shares + clicks) / baseCount) * 100).toFixed(2)) : 0;

      return {
        id: post.id,
        message: post.message || post.story || DEFAULT_CONFIG.NO_CONTENT,
        type: postType,
        platform: 'facebook',
        mediaUrl: post.full_picture || '',
        postUrl: post.permalink_url || `https://www.facebook.com/${post.id}`,
        date: post.created_time,
        status: POST_STATUS.PUBLISHED,
        reach,
        views,
        reactions: counts.reactions || reactionsBreakdownResult.total || 0,
        comments: counts.comments,
        shares: counts.shares,
        clicks,
        linkClicks: insightsResult.linkClicks || 0,
        videoViews: (postType === POST_TYPES.VIDEO || postType === 'REEL') ? Math.round(views * 0.4) : 0,
        videoTimeWatched: (postType === POST_TYPES.VIDEO || postType === 'REEL') ? '0:45' : '0:00',
        engagement,
        spent: 0
      };
    } catch (err) {
      console.error(`Error enriching post insights for post ${post.id}:`, err.message);
      return this._formatFallbackPost(post);
    }
  }

  /**
   * Batched equivalent of mapping `feed.map(post => _enrichPostWithInsights(post, token))`
   * — used by the multi-page recent-window walk (getPublishedPosts), where
   * per-post sequential HTTP calls would multiply badly across pages.
   * Standard posts still use the same metric-name fallback tiers as the
   * single-post path, but only pay for tier 2+ on the posts whose tier-1
   * sub-request actually came back empty/errored, via a follow-up batch —
   * not upfront for every post regardless of outcome.
   */
  async _enrichPostsWithInsightsBatch(feed, pageAccessToken) {
    if (feed.length === 0) return [];

    // One DB round-trip for the whole page instead of one findFirst() per
    // post — same information _enrichPostWithInsights looks up individually.
    const dbPosts = await prisma.post.findMany({
      where: { platformPostId: { in: feed.map(p => p.id) } }
    }).catch(() => []);
    const dbPostByPlatformId = new Map(dbPosts.map(p => [p.platformPostId, p]));

    const isReel = (post) => {
      const dbPost = dbPostByPlatformId.get(post.id);
      return dbPost?.type === 'REEL' || dbPost?.options?.facebookType === 'reel';
    };

    // REEL insights use a single fixed metric (getReelVideoInsights doesn't
    // have the multi-tier fallback problem STANDARD posts do), fetched via
    // the same batch endpoint as everything else here rather than
    // facebookReelGateway's own per-post fetch, to keep this one round-trip.
    const REEL_METRIC = 'blue_reels_play_count';

    let batchRequests = feed.map(post => ({
      postId: post.id,
      metric: isReel(post) ? REEL_METRIC : STANDARD_METRIC_TIERS[0]
    }));

    let insightsByPostId = await this._withTimeout(
      facebookGateway.getBatchPostInsights(batchRequests, pageAccessToken),
      4000,
      new Map()
    );

    // Retry only the STANDARD posts whose tier-1 sub-request errored/came
    // back empty, one tier at a time, same order getPostInsights() used.
    for (let tier = 1; tier < STANDARD_METRIC_TIERS.length; tier++) {
      const failedStandardPosts = feed.filter(post => {
        if (isReel(post)) return false;
        const entry = insightsByPostId.get(post.id);
        return !entry || entry.insights === null || entry.insights.length === 0;
      });
      if (failedStandardPosts.length === 0) break;

      const retryResult = await this._withTimeout(
        facebookGateway.getBatchPostInsights(
          failedStandardPosts.map(post => ({ postId: post.id, metric: STANDARD_METRIC_TIERS[tier] })),
          pageAccessToken
        ),
        4000,
        new Map()
      );
      for (const [postId, entry] of retryResult) {
        const existing = insightsByPostId.get(postId);
        insightsByPostId.set(postId, { insights: entry.insights, reactions: entry.reactions ?? existing?.reactions ?? null });
      }
    }

    return feed.map(post => {
      try {
        const entry = insightsByPostId.get(post.id);
        const reel = isReel(post);
        const insightsResult = reel
          ? this._parseReelInsights(entry?.insights || [])
          : this._parseInsightsMetrics(entry?.insights || []);
        const reactionsBreakdownResult = entry?.reactions || { total: 0, breakdown: {} };

        const counts = this._extractPostCounts(post);
        const postType = reel ? 'REEL' : this._determinePostType(post);

        const reach = insightsResult.reach || insightsResult.views || 0;
        const views = insightsResult.views || insightsResult.reach || 0;
        const clicks = insightsResult.clicks || 0;
        const baseCount = reach || views;
        const engagement = baseCount ? parseFloat((((counts.reactions + counts.comments + counts.shares + clicks) / baseCount) * 100).toFixed(2)) : 0;

        return {
          id: post.id,
          message: post.message || post.story || DEFAULT_CONFIG.NO_CONTENT,
          type: postType,
          platform: 'facebook',
          mediaUrl: post.full_picture || '',
          postUrl: post.permalink_url || `https://www.facebook.com/${post.id}`,
          date: post.created_time,
          status: POST_STATUS.PUBLISHED,
          reach,
          views,
          reactions: counts.reactions || reactionsBreakdownResult.total || 0,
          comments: counts.comments,
          shares: counts.shares,
          clicks,
          linkClicks: insightsResult.linkClicks || 0,
          videoViews: (postType === POST_TYPES.VIDEO || postType === 'REEL') ? Math.round(views * 0.4) : 0,
          videoTimeWatched: (postType === POST_TYPES.VIDEO || postType === 'REEL') ? '0:45' : '0:00',
          engagement,
          spent: 0
        };
      } catch (err) {
        console.error(`Error enriching post insights (batch) for post ${post.id}:`, err.message);
        return this._formatFallbackPost(post);
      }
    });
  }

  _parseReelInsights(insights) {
    const metrics = { reach: 0, views: 0, clicks: 0, linkClicks: 0 };
    for (const item of insights) {
      if (item.name === 'blue_reels_play_count') {
        metrics.views = item.values?.[0]?.value || 0;
        metrics.reach = metrics.views;
      }
    }
    return metrics;
  }

  _parseInsightsMetrics(insights) {
    const result = { reach: 0, views: 0, clicks: 0, linkClicks: 0 };
    for (const item of insights) {
      if (item.name === 'post_total_media_view_unique' || item.name === 'post_impressions_unique') {
        result.reach = item.values?.[0]?.value || 0;
      } else if (item.name === 'post_media_view' || item.name === 'post_impressions') {
        result.views = item.values?.[0]?.value || 0;
      } else if (item.name === 'post_clicks_by_type') {
        const types = item.values?.[0]?.value || {};
        result.clicks = Object.values(types).reduce((sum, val) => sum + val, 0);
        result.linkClicks = types['link clicks'] || 0;
      }
    }
    if (!result.reach && result.views) result.reach = result.views;
    if (!result.views && result.reach) result.views = result.reach;
    return result;
  }

  _extractPostCounts(post) {
    return {
      comments: post.comments?.summary?.total_count || post.comments?.data?.length || 0,
      reactions: post.reactions?.summary?.total_count || post.reactions?.data?.length || 0,
      shares: post.shares?.count || 0
    };
  }

  _determinePostType(post) {
    const attachments = post.attachments?.data || [];
    if (attachments.length === 0) return POST_TYPES.IMAGE;
    const type = attachments[0].type;
    if (type === SOCIAL_TECHNICAL.FB_ATTACHMENT.ALBUM) return POST_TYPES.CAROUSEL;
    if (type === SOCIAL_TECHNICAL.FB_ATTACHMENT.VIDEO_INLINE || type === SOCIAL_TECHNICAL.FB_ATTACHMENT.VIDEO) return POST_TYPES.VIDEO;
    return POST_TYPES.IMAGE;
  }

  _formatFallbackPost(post) {
    const counts = this._extractPostCounts(post);
    const postType = this._determinePostType(post);

    return {
      id: post.id,
      message: post.message || post.story || 'Facebook Post',
      type: postType,
      platform: 'facebook',
      mediaUrl: post.full_picture || '',
      postUrl: post.permalink_url || `https://www.facebook.com/${post.id}`,
      date: post.created_time,
      status: POST_STATUS.PUBLISHED,
      reach: 0,
      views: 0,
      reactions: counts.reactions,
      comments: counts.comments,
      shares: counts.shares,
      clicks: 0,
      linkClicks: 0,
      videoViews: 0,
      videoTimeWatched: '0:00',
      engagement: 0,
      spent: 0
    };
  }
}

module.exports = new FacebookPostService();
