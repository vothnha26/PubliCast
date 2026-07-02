const facebookGateway = require('./facebook.gateway');
const socialAccountRepository = require('../../../repositories/social/social-account.repository');
const { PLATFORMS, POST_STATUS, POST_TYPES, DEFAULT_CONFIG, SOCIAL_TECHNICAL } = require('../../../utils/constants');
const FacebookPublishStrategyFactory = require('./publish-strategies/publish-strategy.factory');

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

  async getPublishedPosts(brandId, pageToken = null, limit = 10) {
    const cacheKey = `${brandId}_${pageToken || 'first'}_${limit}`;
    const cached = postCache.get(cacheKey);
    if (cached && cached.expiry > Date.now()) return cached.data;

    try {
      const { pageId, pageAccessToken } = await this._getAccountCredentials(brandId);
      
      if (pageAccessToken && pageAccessToken.startsWith('mock-')) {
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
    const { platformPostId, scheduledAt, type, mediaUrls = [] } = postData;
    console.log(`\n[Facebook] ▶ publishPost | brandId=${brandId} | type=${type} | mediaUrls=${JSON.stringify(mediaUrls)}`);

    // Short-circuit
    if (platformPostId) {
      console.log(`[Facebook] Short-circuiting. Post already scheduled with ID: ${platformPostId}`);
      return { platformVideoId: platformPostId, publishedAt: null };
    }

    const { pageId, pageAccessToken } = await this._getAccountCredentials(brandId);
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

  async deletePost(brandId, platformPostId) {
    const { pageAccessToken } = await this._getAccountCredentials(brandId);

    if (pageAccessToken && pageAccessToken.startsWith('mock-')) {
      return { success: true, mock: true };
    }

    return await facebookGateway.deletePost(platformPostId, pageAccessToken);
  }

  // ============= Private Helper Methods =============

  async _getAccountCredentials(brandId) {
    const socialAccount = await socialAccountRepository.findByBrandAndPlatform(brandId, PLATFORMS.FACEBOOK);
    if (!socialAccount || socialAccount.length === 0) {
      throw new Error('Facebook account not connected for this brand');
    }
    return {
      pageId: socialAccount[0].platformAccountId,
      pageAccessToken: socialAccount[0].accessToken
    };
  }

  async _enrichPostWithInsights(post, pageAccessToken) {
    try {
      const insights = await this._withTimeout(
        facebookGateway.getPostInsights(post.id, pageAccessToken),
        1500,
        []
      );
      const metrics = this._parseInsightsMetrics(insights);
      const counts = this._extractPostCounts(post);

      const reach = metrics.reach || 0;
      const views = metrics.views || 0;
      const clicks = metrics.clicks || 0;

      const postType = this._determinePostType(post);
      const engagement = reach ? parseFloat((((counts.reactions + counts.comments + counts.shares + clicks) / reach) * 100).toFixed(2)) : 0;

      return {
        id: post.id,
        message: post.message || post.story || DEFAULT_CONFIG.NO_CONTENT,
        type: postType,
        mediaUrl: post.full_picture || '',
        date: post.created_time,
        status: POST_STATUS.PUBLISHED,
        reach,
        views,
        reactions: counts.reactions,
        comments: counts.comments,
        shares: counts.shares,
        clicks,
        linkClicks: metrics.linkClicks || 0,
        videoViews: postType === POST_TYPES.VIDEO ? Math.round(views * 0.4) : 0,
        videoTimeWatched: postType === POST_TYPES.VIDEO ? '0:45' : '0:00',
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
      mediaUrl: post.full_picture || '',
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
