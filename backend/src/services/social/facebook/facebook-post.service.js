const facebookGateway = require('./facebook.gateway');
const facebookReelGateway = require('./facebook-reel.gateway');

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
const { PLATFORMS, POST_STATUS, POST_TYPES, DEFAULT_CONFIG, SOCIAL_TECHNICAL } = require('../../../utils/constants');
const FacebookPublishStrategyFactory = require('./publish-strategies/publish-strategy.factory');
const redisClient = require('../../../config/redis');
const prisma = require('../../../config/prisma');
const DistributedLockService = require('../distributed-lock.service');

const POST_INSIGHTS_CACHE_TTL_SEC = 5 * 60; // 5 minutes
// getVideoDetails() read-through cache: Inbox preview was calling the Graph
// API on every click, including once per top-level comment sharing the same
// post (N+1) — same bug class already fixed for YouTube via TrackedVideo.
// title/thumbnail don't need to be fresher than this.
const VIDEO_DETAILS_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
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

  async getPublishedPosts(brandId, pageToken = null, limit = 10, socialAccountId = null) {
    const cacheKey = `${brandId}_${pageToken || 'first'}_${limit}_${socialAccountId || 'default'}`;
    const cached = postCache.get(cacheKey);
    if (cached && cached.expiry > Date.now()) return cached.data;

    try {
      const { pageId, pageAccessToken } = await this._getAccountCredentials(brandId, socialAccountId);
      
      if ((pageAccessToken && pageAccessToken.startsWith('mock-')) || (pageId && pageId.startsWith('mock-')) || pageId === 'fb-page-mock') {
        return { data: [], nextPageToken: null, prevPageToken: null };
      }

      const feedResult = await this._withTimeout(
        facebookGateway.getPageFeed(pageId, pageAccessToken, pageToken, limit),
        4000,
        { data: [], nextPageToken: null, prevPageToken: null }
      );

      const feed = feedResult.data || [];
      const nextPageToken = feedResult.nextPageToken || null;
      const prevPageToken = feedResult.prevPageToken || null;

      const postsWithInsights = await Promise.all(
        feed.map(post => this._enrichPostWithInsights(post, pageAccessToken))
      );

      const result = {
        data: postsWithInsights,
        nextPageToken,
        prevPageToken
      };

      postCache.set(cacheKey, { data: result, expiry: Date.now() + CACHE_TTL_MS });
      return result;
    } catch (error) {
      if (error.message.includes('Facebook account not connected')) {
        return { data: [], nextPageToken: null, prevPageToken: null };
      }
      throw error;
    }
  }
  async publishPost(brandId, postData) {
    const { platformPostId, scheduledAt, type, mediaUrls = [], socialAccountId } = postData;
    console.log(`\n[Facebook] ▶ publishPost | brandId=${brandId} | type=${type} | mediaUrls=${JSON.stringify(mediaUrls)}`);

    // Short-circuit
    if (platformPostId) {
      console.log(`[Facebook] Short-circuiting. Post already scheduled with ID: ${platformPostId}`);
      return { platformVideoId: platformPostId, publishedAt: null };
    }

    const { pageId, pageAccessToken } = await this._getAccountCredentials(brandId, socialAccountId);
    console.log(`[Facebook] Credentials OK | pageId=${pageId} | tokenPrefix=${pageAccessToken?.substring(0, 10)}...`);

    if (pageAccessToken && (pageAccessToken.startsWith('mock-') || pageAccessToken.includes('mock') || pageAccessToken.startsWith('fb_mock'))) {
      console.log(`[Facebook] Mock publishing detected for mock token. Returning simulated success.`);
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
        console.log(`[Facebook] Using Native Scheduling for scheduledAt: ${scheduledAt}`);
      } else {
        console.log(`[Facebook] Falling back to Queue-based scheduling. isTimeValid: ${isTimeValid}, isTypeSupported: ${isTypeSupported}`);
      }
    }

    const strategy = FacebookPublishStrategyFactory.getStrategy(type, mediaUrl);
    console.log(`[Facebook] Strategy selected: ${strategy.constructor.name} | mediaUrl=${mediaUrl}`);

    try {
      const result = await strategy.publish(pageId, pageAccessToken, { 
        ...postData, 
        mediaUrl, 
        mediaUrls,
        scheduledAt: finalScheduledAt
      });
      console.log(`[Facebook] ✅ Published successfully! platformPostId=${result.id}`);

      // Post First Comment if published immediately
      if (!finalScheduledAt && postData.options?.firstComment?.trim()) {
        try {
          console.log(`[Facebook] Posting first comment: "${postData.options.firstComment.trim()}"`);
          await facebookGateway.createComment(result.id, postData.options.firstComment.trim(), pageAccessToken);
          console.log(`[Facebook] First comment posted successfully.`);
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
      pageAccessToken: account.accessToken
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
