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
const { getHistoryWindowMonths } = require('../plan-history-window.util');
const { PLATFORMS, POST_STATUS, POST_TYPES, DEFAULT_CONFIG, SOCIAL_TECHNICAL, MEDIA_EXTENSIONS } = require('../../../utils/constants');
const { matchesExtension } = require('../../../utils/media-type.utils');
const FacebookPublishStrategyFactory = require('./publish-strategies/publish-strategy.factory');
const prisma = require('../../../config/prisma');
const { eventEmitter, EVENTS } = require('../../../events/event-emitter');
const { upsertPostMetricsDaily, findLatestPostMetrics } = require('../post-metric-daily-persistence.util');

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

  /**
   * Smart Fetch: DB-only read, no live Graph API call is ever triggered from
   * this method. Freshness is entirely the responsibility of Sync (the posts
   * -sync cron scheduler, the OAuth-connect-time backfill, and the manual
   * refresh endpoint — see posts-sync-scheduler.service.js) writing into
   * PostMetricDaily. `pageToken` (manual "next page") also reads DB only now
   * — deep pagination beyond what Sync has cached returns an empty page
   * rather than a live fetch, a deliberate accepted simplification.
   * Returns an empty list if Sync hasn't populated anything yet — never
   * falls back to a live call on empty.
   */
  async getPublishedPosts(brandId, pageToken = null, limit = 10, socialAccountId = null, startDate = null, endDate = null) {
    try {
      const { socialAccountId: resolvedAccountId } = await this._getAccountCredentials(brandId, socialAccountId);
      const rows = await findLatestPostMetrics(brandId, PLATFORMS.FACEBOOK, resolvedAccountId, limit);
      const data = this._filterByDateRange(rows.map(r => this._formatDbMetricRow(r)), startDate, endDate);
      return { data, nextPageToken: null, prevPageToken: null };
    } catch (error) {
      if (error.message.includes('Facebook account not connected')) {
        return { data: [], nextPageToken: null, prevPageToken: null };
      }
      throw error;
    }
  }

  /**
   * Sync-only: the ONE place allowed to call Facebook's live Graph API for
   * published posts. Called from posts-sync-scheduler.service.js's cron
   * webhook, connectChannel's OAuth-time backfill, and the manual-refresh
   * endpoint — never from a read path. Walks the recent-window feed exactly
   * as the old cache-miss branch did, then persists into PostMetricDaily.
   */
  async syncPublishedPosts(brandId, socialAccountId) {
    const { pageId, pageAccessToken } = await this._getAccountCredentials(brandId, socialAccountId);

    if ((pageAccessToken && pageAccessToken.startsWith('mock-')) || (pageId && pageId.startsWith('mock-')) || pageId === 'fb-page-mock') {
      return { synced: 0 };
    }

    const result = await this._fetchRecentWindow(brandId, pageId, pageAccessToken, 50);
    await this._persistPostMetrics(brandId, socialAccountId, result.data);
    return { synced: result.data.length };
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
   * Builds getPublishedPosts()'s response shape from a PostMetricDaily row —
   * platform-specific counters (reactions/linkClicks/otherClicks/
   * engagementRate/videoViews/avgWatchTimeSeconds) live in `metrics` JSON
   * since PostMetricDaily's typed columns only cover the 5 fields common
   * across all 6 platforms (reach/views/likes/comments/shares).
   */
  _formatDbMetricRow(row) {
    const m = row.metrics || {};
    const reach = row.reach || m.videoViews || 0;
    const views = m.videoViews || row.reach || 0;
    const linkClicks = m.linkClicks || 0;
    const otherClicks = m.otherClicks || 0;
    return {
      id: row.platformPostId,
      message: row.captionSnippet || DEFAULT_CONFIG.NO_CONTENT,
      type: row.postType,
      platform: 'facebook',
      mediaUrl: row.thumbnailUrl || '',
      postUrl: row.postUrl || `https://www.facebook.com/${row.platformPostId}`,
      date: row.publishedAt,
      status: POST_STATUS.PUBLISHED,
      reach,
      views,
      reactions: m.reactions ?? row.likes ?? 0,
      comments: row.comments || 0,
      shares: row.shares || 0,
      clicks: linkClicks + otherClicks,
      linkClicks,
      videoViews: m.videoViews || 0,
      videoTimeWatched: m.avgWatchTimeSeconds ? `${Math.round(m.avgWatchTimeSeconds / 60)}:${String(Math.round(m.avgWatchTimeSeconds % 60)).padStart(2, '0')}` : '0:00',
      engagement: m.engagementRate || 0,
      spent: 0
    };
  }

  /** Builds getPostDetails()'s response shape from a PostMetricDaily row —
   * the DB-only counterpart to the live-fetch branch's shape. Reaction
   * breakdown by type isn't persisted (nothing queries it in SQL, unlike
   * reach/views/comments) — only the total is available. */
  _formatDetailMetricRow(row, platformPostId) {
    const m = row.metrics || {};
    const linkClicks = m.linkClicks || 0;
    const otherClicks = m.otherClicks || 0;
    return {
      postDetails: {
        id: platformPostId,
        message: row.captionSnippet || DEFAULT_CONFIG.NO_CONTENT,
        type: row.postType,
        mediaUrl: row.thumbnailUrl || '',
        permalinkUrl: row.postUrl || `https://www.facebook.com/${platformPostId}`,
        date: row.publishedAt,
        platform: 'facebook'
      },
      reach: row.reach || 0,
      views: m.videoViews || 0,
      clicks: linkClicks + otherClicks,
      linkClicks,
      comments: row.comments || 0,
      shares: row.shares || 0,
      reactions: {
        total: m.reactions ?? row.likes ?? 0,
        breakdown: {}
      }
    };
  }

  /** Sync-only: upserts the freshly-enriched page(s) of posts into
   * PostMetricDaily so the next getPublishedPosts call can be DB-only.
   * Platform-specific counters not covered by PostMetricDaily's typed
   * columns go into `metrics` JSON. */
  async _persistPostMetrics(brandId, socialAccountId, posts) {
    const rows = posts.map(post => {
      const postType = post.type === POST_TYPES.REEL ? POST_TYPES.REEL : (post.type || POST_TYPES.IMAGE);
      return {
        platformPostId: post.id,
        postType,
        publishedAt: post.date ? new Date(post.date) : null,
        reach: post.reach || 0,
        views: post.views || 0,
        likes: post.reactions || 0,
        comments: post.comments || 0,
        shares: post.shares || 0,
        captionSnippet: post.message || null,
        thumbnailUrl: post.mediaUrl || null,
        postUrl: post.postUrl || null,
        metrics: {
          videoViews: post.videoViews || 0,
          reactions: post.reactions || 0,
          linkClicks: post.linkClicks || 0,
          otherClicks: Math.max((post.clicks || 0) - (post.linkClicks || 0), 0),
          engagementRate: post.engagement || 0,
          avgWatchTimeSeconds: null
        }
      };
    });

    await upsertPostMetricsDaily(brandId, socialAccountId, PLATFORMS.FACEBOOK, rows);
  }

  /** Walks pages from the start, stopping at whichever comes first: a post
   * older than the brand's plan-based history window, or MAX_PAGE_COUNT.
   * Kept lower than TikTok's page cap since every Facebook post still costs
   * 2 sub-requests each (insights + reactions) even when batched — batching
   * cuts round-trips, not the per-post BUC quota cost
   * (developers.facebook.com/docs/graph-api/overview/rate-limiting/). */
  async _fetchRecentWindow(brandId, pageId, pageAccessToken, limit) {
    const MAX_PAGE_COUNT = 5;
    const windowMonths = await getHistoryWindowMonths(brandId);
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

    // Facebook's Graph API has no "mixed carousel" endpoint — an album can
    // only contain photos, never a video alongside them. Previously
    // publishPost only ever looked at mediaUrls[0], so picking 2-3 files
    // (any mix) silently published just the first one and dropped the rest
    // with no error. Now: photos-only + ≥2 files auto-routes to the album
    // strategy (no more requiring the user to manually pick "Album" as the
    // post type); a video anywhere in the selection wins outright — every
    // photo in the same selection is dropped so the post still goes out
    // (as that one video) instead of silently truncating to whichever
    // media happened to be mediaUrls[0].
    const effectiveMediaUrls = Array.isArray(mediaUrls) ? mediaUrls.filter(Boolean) : [];
    const videoUrls = effectiveMediaUrls.filter((url) => matchesExtension(url, MEDIA_EXTENSIONS.VIDEO));
    const photoUrls = effectiveMediaUrls.filter((url) => !matchesExtension(url, MEDIA_EXTENSIONS.VIDEO));

    let resolvedMediaUrls = effectiveMediaUrls;
    let resolvedType = type;
    if (videoUrls.length > 0 && photoUrls.length > 0) {
      logger.debug(`[Facebook] Selection mixed ${videoUrls.length} video(s) with ${photoUrls.length} photo(s) — Facebook doesn't support that in one post. Keeping only the video, dropping the photo(s).`);
      resolvedMediaUrls = [videoUrls[0]];
      resolvedType = POST_TYPES.VIDEO;
    } else if (photoUrls.length >= 2 && type !== POST_TYPES.REEL && type !== POST_TYPES.STORY) {
      resolvedType = POST_TYPES.CAROUSEL;
    }

    const mediaUrl = resolvedMediaUrls.length > 0 ? resolvedMediaUrls[0] : null;

    // Check if we can use native scheduling
    let finalScheduledAt = null;
    if (scheduledAt) {
      const diffMs = new Date(scheduledAt).getTime() - Date.now();
      // Meta requires 10 minutes to 75 days.
      const isTimeValid = diffMs >= 10 * 60 * 1000 && diffMs <= 75 * 24 * 60 * 60 * 1000;
      const isTypeSupported = resolvedType !== POST_TYPES.STORY && resolvedType !== POST_TYPES.REEL; // Reels / Stories are queue-based

      if (isTimeValid && isTypeSupported) {
        finalScheduledAt = scheduledAt;
        logger.debug(`[Facebook] Using Native Scheduling for scheduledAt: ${scheduledAt}`);
      } else {
        logger.debug(`[Facebook] Falling back to Queue-based scheduling. isTimeValid: ${isTimeValid}, isTypeSupported: ${isTypeSupported}`);
      }
    }

    const strategy = FacebookPublishStrategyFactory.getStrategy(resolvedType, mediaUrl);
    logger.debug(`[Facebook] Strategy selected: ${strategy.constructor.name} | mediaUrl=${mediaUrl} | resolvedType=${resolvedType}`);

    try {
      const result = await strategy.publish(pageId, pageAccessToken, {
        ...postData,
        mediaUrl,
        mediaUrls: resolvedMediaUrls,
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
   * Lấy chi tiết phân tích 1 bài viết Facebook (Overview + Reactions breakdown).
   * DB-first (see FacebookPostMetric), same pattern as YouTube's
   * getPostInsights (youtube-analytics.service.js) — the DB row is the
   * permanent record of the last real fetch, no separate short-TTL cache
   * layer on top of it. Facebook's insights metrics only refresh server-side
   * about once every 24h, matching FACEBOOK_POST_METRICS_TTL_MS.
   */
  async getPostDetails(brandId, platformPostId, socialAccountId = null) {
    const row = await prisma.postMetricDaily.findFirst({
      where: { brandId, platformPostId, platform: PLATFORMS.FACEBOOK },
      orderBy: { snapshotDate: 'desc' }
    });
    if (!row) return null;
    return this._formatDetailMetricRow(row, platformPostId);
  }

  /**
   * Lightweight post lookup for inbox thread headers (title/thumbnail/real
   * Facebook permalink) — DB-only (Smart Fetch), reads the latest
   * PostMetricDaily row with no insights/reactions, since the inbox thread
   * view only needs enough to render a header and a working "view on
   * Facebook" link, not analytics.
   */
  async getVideoDetails(brandId, platformPostId, socialAccountId = null) {
    const cached = await prisma.postMetricDaily.findFirst({
      where: { brandId, platformPostId, platform: PLATFORMS.FACEBOOK },
      orderBy: { snapshotDate: 'desc' }
    });
    if (!cached) return null;

    return {
      id: platformPostId,
      title: (cached.captionSnippet || 'Facebook Post').slice(0, 60),
      thumbnailUrl: cached.thumbnailUrl || null,
      channelTitle: 'Facebook',
      postUrl: cached.postUrl || `https://www.facebook.com/${platformPostId}`
    };
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
      }
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
