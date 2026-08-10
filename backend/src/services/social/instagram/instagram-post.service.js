const instagramGateway = require('./instagram.gateway');
const socialAccountRepository = require('../../../repositories/social/social-account.repository');
const { getHistoryWindowMonths } = require('../plan-history-window.util');
const { PLATFORMS, POST_STATUS, POST_TYPES, DEFAULT_CONFIG } = require('../../../utils/constants');
const { computeCommentScore } = require('../../../utils/comment-score.util');
const InstagramPublishStrategyFactory = require('./publish-strategies/publish-strategy.factory');
const logger = require('../../../utils/logger');
const { upsertPostMetricsDaily, findLatestPostMetrics } = require('../post-metric-daily-persistence.util');

// Instagram Graph API has no date-range filter for media, and (unlike
// Facebook Pages) no batch/multi-id insights endpoint to reduce round-trips
// — the only lever available is bounding how many pages this walk makes.
// Kept intentionally lower than TikTok's MAX_PAGE_COUNT since every
// Instagram post still costs 1 extra insights call each (no batching).
const MAX_PAGE_COUNT = 5;

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

  /**
   * Smart Fetch: DB-only read, no live Graph API call is ever triggered from
   * this method — see FacebookPostService#getPublishedPosts for the full
   * rationale (same pattern applied here). `pageToken` also reads DB only;
   * deep pagination beyond what Sync has cached returns an empty page.
   */
  // Uses _getAccountCredentialsLite (only needs socialAccountId, unlike the
  // token/igAccountId sync callers below) — see social-account.repository.js's
  // findByIdLite() doc comment for why.
  async getPublishedPosts(brandId, pageToken = null, limit = 10, socialAccountId = null, startDate = null, endDate = null) {
    try {
      const { socialAccountId: resolvedAccountId } = await this._getAccountCredentialsLite(brandId, socialAccountId);
      const rows = await findLatestPostMetrics(brandId, PLATFORMS.INSTAGRAM, resolvedAccountId, limit, startDate, endDate);
      const data = rows.map(r => this._formatDbMetricRow(r));
      return { data, nextPageToken: null, prevPageToken: null };
    } catch (error) {
      if (error.message.includes('Instagram account not connected')) {
        return { data: [], nextPageToken: null, prevPageToken: null };
      }
      throw error;
    }
  }

  /**
   * Sync-only: the ONE place allowed to call Instagram's live Graph API for
   * published posts. Called from posts-sync-scheduler.service.js's cron
   * webhook, connectChannel's OAuth-time backfill, and the manual-refresh
   * endpoint — never from a read path.
   */
  async syncPublishedPosts(brandId, socialAccountId) {
    const { igAccountId, accessToken } = await this._getAccountCredentials(brandId, socialAccountId);

    if (accessToken && accessToken.startsWith('mock-')) {
      return { synced: 0 };
    }

    const result = await this._fetchRecentWindow(brandId, igAccountId, accessToken, 50);
    await this._persistPostMetrics(brandId, socialAccountId, result.data);
    return { synced: result.data.length };
  }

  /** Builds getPublishedPosts()'s response shape from a PostMetricDaily row
   * — clicks/linkClicks aren't typed columns on PostMetricDaily, so they
   * live in `metrics` JSON. */
  _formatDbMetricRow(row) {
    const m = row.metrics || {};
    const clicks = m.clicks || 0;
    return {
      id: row.platformPostId,
      message: row.captionSnippet || DEFAULT_CONFIG.NO_CONTENT,
      type: row.postType || POST_TYPES.IMAGE,
      mediaUrl: row.thumbnailUrl || '',
      thumbnailUrl: row.thumbnailUrl || '',
      postUrl: row.postUrl || null,
      date: row.publishedAt,
      status: POST_STATUS.PUBLISHED,
      reach: row.reach || 0,
      views: row.views || 0,
      reactions: row.likes || 0,
      comments: row.comments || 0,
      shares: row.shares || 0,
      clicks,
      linkClicks: Math.round(clicks * 0.2),
      videoViews: row.postType === POST_TYPES.VIDEO ? (row.views || 0) : 0,
      videoTimeWatched: row.postType === POST_TYPES.VIDEO ? '0:20' : '0:00',
      engagement: m.engagementRate || 0,
      commentScore: computeCommentScore({ comments: row.comments || 0, likes: row.likes || 0, shares: row.shares || 0, reach: row.reach || 0 }),
      spent: 0
    };
  }

  /** Sync-only: upserts the freshly-enriched page(s) of posts into
   * PostMetricDaily so the next getPublishedPosts call can be DB-only. */
  async _persistPostMetrics(brandId, socialAccountId, posts) {
    const rows = posts.map(post => ({
      platformPostId: post.id,
      postType: post.type || null,
      publishedAt: post.date ? new Date(post.date) : null,
      reach: post.reach || 0,
      views: post.views || 0,
      likes: post.reactions || 0,
      comments: post.comments || 0,
      shares: post.shares || 0,
      captionSnippet: post.message || null,
      thumbnailUrl: post.thumbnailUrl || post.mediaUrl || null,
      postUrl: post.postUrl || null,
      metrics: {
        clicks: post.clicks || 0,
        engagementRate: post.engagement || 0
      }
    }));

    await upsertPostMetricsDaily(brandId, socialAccountId, PLATFORMS.INSTAGRAM, rows);
  }

  /** Walks pages from the start, stopping at whichever comes first: a post
   * older than the brand's plan-based history window, or MAX_PAGE_COUNT. */
  async _fetchRecentWindow(brandId, igAccountId, accessToken, limit) {
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
  // the brand only has one, still the common case). A socialAccountId that
  // doesn't match any of the brand's own IG accounts must fail loudly rather
  // than silently substituting a different account (would otherwise fetch/
  // write data for the wrong account without any error surfaced).
  async _getAccountCredentials(brandId, socialAccountId = null) {
    const socialAccount = await socialAccountRepository.findByBrandAndPlatform(brandId, PLATFORMS.INSTAGRAM);
    if (!socialAccount || socialAccount.length === 0) {
      throw new Error('Instagram account not connected for this brand');
    }
    let account;
    if (socialAccountId) {
      account = socialAccount.find(acc => acc.id === socialAccountId);
      if (!account) {
        throw new Error('Instagram account not connected for this brand');
      }
    } else {
      account = socialAccount[0];
    }
    return {
      igAccountId: account.platformAccountId,
      accessToken: account.accessToken,
      socialAccountId: account.id
    };
  }

  /**
   * Lite variant of _getAccountCredentials() above — for getPublishedPosts()'s
   * DB-only read path, which only ever reads socialAccountId off the
   * result, never igAccountId/accessToken the way the sync callers do.
   */
  async _getAccountCredentialsLite(brandId, socialAccountId = null) {
    const socialAccount = await socialAccountRepository.findByBrandAndPlatformLite(brandId, PLATFORMS.INSTAGRAM);
    if (!socialAccount || socialAccount.length === 0) {
      throw new Error('Instagram account not connected for this brand');
    }
    let account;
    if (socialAccountId) {
      account = socialAccount.find(acc => acc.id === socialAccountId);
      if (!account) {
        throw new Error('Instagram account not connected for this brand');
      }
    } else {
      account = socialAccount[0];
    }
    return {
      igAccountId: account.platformAccountId,
      accessToken: account.accessToken,
      socialAccountId: account.id
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
        commentScore: computeCommentScore({ comments, likes: reactions, shares, reach }),
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
      // reach is 0 here (no insights data in the fallback path), so
      // computeCommentScore would score 0 regardless — skip the call and
      // just state that explicitly instead of implying it was computed.
      commentScore: 0,
      spent: 0
    };
  }
}

module.exports = new InstagramPostService();
