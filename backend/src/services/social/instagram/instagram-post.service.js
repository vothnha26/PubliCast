const instagramGateway = require('./instagram.gateway');
const socialAccountRepository = require('../../../repositories/social/social-account.repository');
const { PLATFORMS, POST_STATUS, POST_TYPES, DEFAULT_CONFIG } = require('../../../utils/constants');
const InstagramPublishStrategyFactory = require('./publish-strategies/publish-strategy.factory');

const postCache = new Map();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

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

  async getPublishedPosts(brandId, pageToken = null, limit = 10) {
    const cacheKey = `${brandId}_${pageToken || 'first'}_${limit}`;
    const cached = postCache.get(cacheKey);
    if (cached && cached.expiry > Date.now()) return cached.data;

    try {
      const { igAccountId, accessToken } = await this._getAccountCredentials(brandId);
      
      if (accessToken && accessToken.startsWith('mock-')) {
        return { data: [], nextPageToken: null, prevPageToken: null };
      }

      const feedResult = await this._withTimeout(
        instagramGateway.getInstagramMediaFeed(igAccountId, accessToken, pageToken, limit),
        4000,
        { data: [], nextPageToken: null, prevPageToken: null }
      );

      const feed = feedResult.data || [];
      const nextPageToken = feedResult.nextPageToken || null;
      const prevPageToken = feedResult.prevPageToken || null;

      const postsWithInsights = await Promise.all(
        feed.map(post => this._enrichPostWithInsights(post, accessToken))
      );

      const result = {
        data: postsWithInsights,
        nextPageToken,
        prevPageToken
      };

      postCache.set(cacheKey, { data: result, expiry: Date.now() + CACHE_TTL_MS });
      return result;
    } catch (error) {
      if (error.message.includes('Instagram account not connected')) {
        return { data: [], nextPageToken: null, prevPageToken: null };
      }
      throw error;
    }
  }

  async publishPost(brandId, postData) {
    const { platformPostId, scheduledAt, type, mediaUrls = [] } = postData;
    console.log(`\n[Instagram] ▶ publishPost | brandId=${brandId} | type=${type} | mediaUrls=${JSON.stringify(mediaUrls)}`);

    // Short-circuit
    if (platformPostId) {
      console.log(`[Instagram] Short-circuiting. Post already scheduled with ID: ${platformPostId}`);
      return { platformVideoId: platformPostId, publishedAt: null };
    }

    const { igAccountId, accessToken } = await this._getAccountCredentials(brandId);
    console.log(`[Instagram] Credentials OK | igAccountId=${igAccountId} | tokenPrefix=${accessToken?.substring(0, 10)}...`);

    if (accessToken && (accessToken.startsWith('mock-') || accessToken.includes('mock') || accessToken.startsWith('ig_mock') || accessToken.includes('fb_mock'))) {
      console.log(`[Instagram] Mock publishing detected for mock token. Returning simulated success.`);
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
        console.log(`[Instagram] Using Native Scheduling for scheduledAt: ${scheduledAt}`);
      } else {
        console.log(`[Instagram] Falling back to Queue-based scheduling. isTimeValid: ${isTimeValid}, isTypeSupported: ${isTypeSupported}`);
      }
    }

    const strategy = InstagramPublishStrategyFactory.getStrategy(type, mediaUrls);
    console.log(`[Instagram] Strategy selected: ${strategy.constructor.name}`);

    try {
      const result = await strategy.publish(igAccountId, accessToken, {
        ...postData,
        scheduledAt: finalScheduledAt
      });
      console.log(`[Instagram] ✅ Published successfully! platformPostId=${result.id}`);

      // Post First Comment if published immediately
      if (!finalScheduledAt && postData.options?.firstComment?.trim()) {
        try {
          console.log(`[Instagram] Posting first comment: "${postData.options.firstComment.trim()}"`);
          await instagramGateway.createComment(result.id, postData.options.firstComment.trim(), accessToken);
          console.log(`[Instagram] First comment posted successfully.`);
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
    console.log(`[Instagram Post Service] deletePost triggered for brandId: ${brandId}, platformPostId: ${platformPostId}`);
    console.warn(`[Instagram Post Service] Instagram Graph API does not support deleting posts via 3rd party apps. Simulating success.`);
    return { success: true, warning: 'Instagram does not support remote deletion via API' };
  }

  // ============= Private Helper Methods =============

  async _getAccountCredentials(brandId) {
    const socialAccount = await socialAccountRepository.findByBrandAndPlatform(brandId, PLATFORMS.INSTAGRAM);
    if (!socialAccount || socialAccount.length === 0) {
      throw new Error('Instagram account not connected for this brand');
    }
    return {
      igAccountId: socialAccount[0].platformAccountId,
      accessToken: socialAccount[0].accessToken
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
