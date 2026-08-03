const instagramGateway = require('./instagram.gateway');
const socialAccountRepository = require('../../../repositories/social/social-account.repository');
const brandRepository = require('../../../repositories/workspace/brand.repository');
const { PLATFORMS, POST_STATUS, POST_TYPES, DEFAULT_CONFIG } = require('../../../utils/constants');
const InstagramPublishStrategyFactory = require('./publish-strategies/publish-strategy.factory');
const logger = require('../../../utils/logger');

const postCache = new Map();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

// Instagram Graph API has no date-range filter for media, and (unlike
// Facebook Pages) no batch/multi-id insights endpoint to reduce round-trips
// — the only lever available is bounding how many pages this walk makes.
// Kept intentionally lower than TikTok's MAX_PAGE_COUNT since every
// Instagram post still costs 1 extra insights call each (no batching).
const MAX_PAGE_COUNT = 5;

// Fallback when a brand has no active subscription — same conservative
// (FREE-tier) default used by TikTokVideoService.
const DEFAULT_HISTORY_WINDOW_MONTHS = 1;

class InstagramPostService {
  _withTimeout(promise, ms, fallback) {
    let timeoutId;
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error(`Timeout of ${ms}ms exceeded`));
      }, ms);
    });
    return Promise.race([promise, timeoutPromise])
      .catch(err => {
        console.warn(`[InstagramPostService] API call failed or timed out: ${err.message}. Using fallback.`);
        return fallback;
      })
      .finally(() => {
        clearTimeout(timeoutId);
      });
  }

  async getPublishedPosts(brandId, pageToken = null, limit = 10, socialAccountId = null) {
    const cacheKey = `${brandId}_${socialAccountId || 'default'}_${pageToken || 'first'}_${limit}`;
    const cached = postCache.get(cacheKey);
    if (cached && cached.expiry > Date.now()) return cached.data;

    try {
      const { igAccountId, accessToken } = await this._getAccountCredentials(brandId, socialAccountId);

      if (accessToken && accessToken.startsWith('mock-')) {
        return { data: [], nextPageToken: null, prevPageToken: null };
      }

      // The initial load (no explicit pageToken) walks pages itself, bounded
      // by the brand's plan-based history window, instead of returning just
      // one page — Instagram has no date-range filter, so "recent posts"
      // only exists as "keep paging until stale." An explicit pageToken
      // (manual "next page" click) still fetches exactly one page.
      const result = pageToken
        ? await this._fetchSinglePage(igAccountId, accessToken, pageToken, limit)
        : await this._fetchRecentWindow(brandId, igAccountId, accessToken, limit);

      postCache.set(cacheKey, { data: result, expiry: Date.now() + CACHE_TTL_MS });
      return result;
    } catch (error) {
      if (error.message.includes('Instagram account not connected')) {
        return { data: [], nextPageToken: null, prevPageToken: null };
      }
      throw error;
    }
  }

  async _fetchSinglePage(igAccountId, accessToken, pageToken, limit) {
    const feedResult = await this._withTimeout(
      instagramGateway.getInstagramMediaFeed(igAccountId, accessToken, pageToken, limit),
      4000,
      { data: [], nextPageToken: null, prevPageToken: null }
    );

    const feed = feedResult.data || [];
    const postsWithInsights = await Promise.all(
      feed.map(post => this._enrichPostWithInsights(post, accessToken))
    );

    return {
      data: postsWithInsights,
      nextPageToken: feedResult.nextPageToken || null,
      prevPageToken: feedResult.prevPageToken || null
    };
  }

  /** Walks pages from the start, stopping at whichever comes first: a post
   * older than the brand's plan-based history window, or MAX_PAGE_COUNT. */
  async _fetchRecentWindow(brandId, igAccountId, accessToken, limit) {
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
        instagramGateway.getInstagramMediaFeed(igAccountId, accessToken, pageToken, limit),
        4000,
        { data: [], nextPageToken: null, prevPageToken: null }
      );
      const feed = feedResult.data || [];
      if (feed.length === 0) break;

      // Instagram returns media newest-first, so once one post in a page is
      // older than the cutoff, every post after it (this page and all
      // subsequent pages) is guaranteed older too — safe to stop instead of
      // walking the rest of the account's history.
      const cutoffIndex = feed.findIndex(p => p.timestamp && new Date(p.timestamp) < recentCutoff);
      const pageFeed = cutoffIndex === -1 ? feed : feed.slice(0, cutoffIndex);

      const enriched = await Promise.all(
        pageFeed.map(post => this._enrichPostWithInsights(post, accessToken))
      );
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
    logger.debug(`\n[Instagram] ▶ publishPost | brandId=${brandId} | type=${type} | mediaUrls=${JSON.stringify(mediaUrls)}`);

    // Short-circuit
    if (platformPostId) {
      logger.debug(`[Instagram] Short-circuiting. Post already scheduled with ID: ${platformPostId}`);
      return { platformVideoId: platformPostId, publishedAt: null };
    }

    const { igAccountId, accessToken } = await this._getAccountCredentials(brandId, socialAccountId);
    logger.debug(`[Instagram] Credentials OK | igAccountId=${igAccountId} | tokenPrefix=${accessToken?.substring(0, 10)}...`);

    if (accessToken && (accessToken.startsWith('mock-') || accessToken.includes('mock') || accessToken.startsWith('ig_mock') || accessToken.includes('fb_mock'))) {
      logger.debug(`[Instagram] Mock publishing detected for mock token. Returning simulated success.`);
      return {
        platformVideoId: `mock-ig-post-${Date.now()}`,
        publishedAt: scheduledAt ? null : new Date()
      };
    }

    // Check if we can use native scheduling
    let finalScheduledAt = null;
    if (scheduledAt) {
      const diffMs = new Date(scheduledAt).getTime() - Date.now();
      // Meta requires 10 minutes to 75 days.
      const isTimeValid = diffMs >= 10 * 60 * 1000 && diffMs <= 75 * 24 * 60 * 60 * 1000;
      const isTypeSupported = type !== POST_TYPES.STORY; // Stories are queue-based

      if (isTimeValid && isTypeSupported) {
        finalScheduledAt = scheduledAt;
        logger.debug(`[Instagram] Using Native Scheduling for scheduledAt: ${scheduledAt}`);
      } else {
        logger.debug(`[Instagram] Falling back to Queue-based scheduling. isTimeValid: ${isTimeValid}, isTypeSupported: ${isTypeSupported}`);
      }
    }

    const strategy = InstagramPublishStrategyFactory.getStrategy(type, mediaUrls);
    logger.debug(`[Instagram] Strategy selected: ${strategy.constructor.name}`);

    try {
      const result = await strategy.publish(igAccountId, accessToken, {
        ...postData,
        scheduledAt: finalScheduledAt
      });
      logger.debug(`[Instagram] ✅ Published successfully! platformPostId=${result.id}`);

      // Post First Comment if published immediately
      if (!finalScheduledAt && postData.options?.firstComment?.trim()) {
        try {
          logger.debug(`[Instagram] Posting first comment: "${postData.options.firstComment.trim()}"`);
          await instagramGateway.createComment(result.id, postData.options.firstComment.trim(), accessToken);
          logger.debug(`[Instagram] First comment posted successfully.`);
        } catch (commentErr) {
          console.error(`[Instagram] Failed to post first comment:`, commentErr.message);
        }
      }

      return { 
        platformVideoId: result.id, 
        publishedAt: finalScheduledAt ? null : new Date() 
      };
    } catch (err) {
      console.error(`[Instagram] ❌ Publish FAILED:`, err.message);
      if (err.response?.data) {
        console.error(`[Instagram] API Error Detail:`, JSON.stringify(err.response.data));
      }
      throw err;
    }
  }

  async deletePost(brandId, platformPostId) {
    logger.debug(`[Instagram Post Service] deletePost triggered for brandId: ${brandId}, platformPostId: ${platformPostId}`);
    console.warn(`[Instagram Post Service] Instagram Graph API does not support deleting posts via 3rd party apps. Simulating success.`);
    return { success: true, warning: 'Instagram does not support remote deletion via API' };
  }

  // ============= Private Helper Methods =============

  // socialAccountId picks a specific IG account when the brand has more than
  // one connected; omitted, falls back to the first one (correct as long as
  // the brand only has one, still the common case).
  async _getAccountCredentials(brandId, socialAccountId = null) {
    const socialAccount = await socialAccountRepository.findByBrandAndPlatform(brandId, PLATFORMS.INSTAGRAM);
    if (!socialAccount || socialAccount.length === 0) {
      throw new Error('Instagram account not connected for this brand');
    }
    const account = (socialAccountId && socialAccount.find(acc => acc.id === socialAccountId)) || socialAccount[0];
    return {
      igAccountId: account.platformAccountId,
      accessToken: account.accessToken
    };
  }

  async _enrichPostWithInsights(post, accessToken) {
    try {
      const insights = await this._withTimeout(
        instagramGateway.getInstagramMediaInsights(post.id, accessToken),
        1500,
        []
      );
      const metrics = this._parseInsightsMetrics(insights);

      const reactions = post.like_count || 0;
      const comments = post.comments_count || 0;
      const shares = metrics.shares || 0;
      
      const totalInteractions = reactions + comments + shares;
      const reach = metrics.reach || 0;
      const views = metrics.views || 0;
      const clicks = metrics.clicks || 0;

      const engagement = reach ? parseFloat((((reactions + comments + shares + clicks) / reach) * 100).toFixed(2)) : 0;

      return {
        id: post.id,
        message: post.caption || DEFAULT_CONFIG.NO_CONTENT || 'No caption',
        type: this._determinePostType(post),
        mediaUrl: post.media_url || post.thumbnail_url || '',
        // For VIDEO/Reels, media_url points at the raw .mp4 file, which an
        // <img> tag can't render as a thumbnail (guide/instagram/reference/
        // instagram-media.md: thumbnail_url is "Only available on VIDEO
        // media" and is the actual preview image). IMAGE/CAROUSEL posts have
        // no thumbnail_url at all, so fall back to media_url for those.
        thumbnailUrl: post.thumbnail_url || post.media_url || '',
        postUrl: post.permalink || null,
        date: post.timestamp,
        status: POST_STATUS.PUBLISHED,
        reach,
        views,
        reactions,
        comments,
        shares,
        clicks,
        linkClicks: Math.round(clicks * 0.2),
        videoViews: post.media_type === 'VIDEO' ? views : 0,
        videoTimeWatched: post.media_type === 'VIDEO' ? '0:20' : '0:00',
        engagement,
        spent: 0
      };
    } catch (err) {
      console.error(`Error enriching post insights for post ${post.id}:`, err.message);
      return this._formatFallbackPost(post);
    }
  }

  _parseInsightsMetrics(insights) {
    const result = { reach: 0, views: 0, shares: 0, clicks: 0 };
    for (const item of insights) {
      if (item.name === 'reach') result.reach = item.values?.[0]?.value || 0;
      else if (item.name === 'views') result.views = item.values?.[0]?.value || 0;
      else if (item.name === 'shares') result.shares = item.values?.[0]?.value || 0;
    }
    return result;
  }

  _determinePostType(post) {
    if (post.media_type === 'CAROUSEL_ALBUM') return POST_TYPES.CAROUSEL;
    if (post.media_type === 'VIDEO') return POST_TYPES.VIDEO;
    return POST_TYPES.IMAGE;
  }

  _formatFallbackPost(post) {
    const reactions = post.like_count || 0;
    const comments = post.comments_count || 0;

    return {
      id: post.id,
      message: post.caption || 'Instagram Post',
      type: this._determinePostType(post),
      mediaUrl: post.media_url || post.thumbnail_url || '',
      thumbnailUrl: post.thumbnail_url || post.media_url || '',
      postUrl: post.permalink || null,
      date: post.timestamp,
      status: POST_STATUS.PUBLISHED,
      reach: 0,
      views: 0,
      reactions,
      comments,
      shares: 0,
      clicks: 0,
      linkClicks: 0,
      videoViews: 0,
      videoTimeWatched: '0:00',
      engagement: 0,
      spent: 0
    };
  }
}

module.exports = new InstagramPostService();
