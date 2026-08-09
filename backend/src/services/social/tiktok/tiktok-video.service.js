const tiktokGateway = require('./tiktok.gateway');
const tiktokAnalytics = require('./tiktok-analytics.service');
const socialAccountRepository = require('../../../repositories/social/social-account.repository');
const { getHistoryWindowMonths } = require('../plan-history-window.util');
const quotaService = require('../quota-tracker.singleton');
const { PLATFORMS, POST_STATUS, QUOTA_TTL_STRATEGY } = require('../../../utils/constants');
const logger = require('../../../utils/logger');
const { upsertPostMetricsDaily, findLatestPostMetrics } = require('../post-metric-daily-persistence.util');

const TIKTOK_VIDEO_LIST_QUOTA_SERVICE = 'tiktok-video-list';

class TikTokVideoService {
  // DB-only read — Smart Fetch: no live TikTok API call happens here.
  // pageToken beyond what Sync has already cached returns empty rather
  // than falling back to a live fetch (accepted simplification).
  async getPublishedVideos(brandId, pageToken = 0, limit = 10, socialAccountId = null, startDate = null, endDate = null) {
    try {
      const account = await this._getAccount(brandId, socialAccountId);
      const rows = await findLatestPostMetrics(brandId, PLATFORMS.TIKTOK, account.id, limit);
      const videos = this._filterByDateRange(rows.map(r => this._formatDbMetricRow(r)), startDate, endDate);
      return { videos, nextPageToken: null, prevPageToken: null };
    } catch (err) {
      if (err.message.includes('TikTok account not connected')) {
        return { videos: [], nextPageToken: null, prevPageToken: null };
      }
      throw err;
    }
  }

  // Smart Fetch Sync — the only method allowed to call TikTok's live API
  // for published videos. Called by the posts-sync scheduler webhook,
  // OAuth-connect-time backfill, and the manual-refresh endpoint.
  async syncPublishedVideos(brandId, socialAccountId) {
    let account = await this._getAccount(brandId, socialAccountId);

    if (account && (
      (account.accessToken && account.accessToken.startsWith('mock-')) ||
      (account.platformAccountId && account.platformAccountId.startsWith('mock-'))
    )) {
      return { synced: 0 };
    }

    account = await tiktokAnalytics.getOrRefreshAccount(account);
    const result = await this._fetchRecentWindow(brandId, account);
    await this._persistVideoMetrics(brandId, account.id, result.videos);
    return { synced: result.videos.length };
  }

  _formatDbMetricRow(row) {
    const m = row.metrics || {};
    return {
      id: row.platformPostId,
      title: row.captionSnippet || '',
      thumbnailUrl: row.thumbnailUrl || '',
      publishedAt: row.publishedAt,
      views: row.views || 0,
      likes: row.likes || 0,
      comments: row.comments || 0,
      shares: row.shares || 0,
      duration: m.duration || 0,
      status: POST_STATUS.PUBLISHED,
      platform: 'TIKTOK',
      postUrl: row.postUrl || `https://www.tiktok.com/video/${row.platformPostId}`,
      shareUrl: row.postUrl || `https://www.tiktok.com/video/${row.platformPostId}`
    };
  }

  async _persistVideoMetrics(brandId, socialAccountId, videos) {
    const rows = videos.map(v => ({
      platformPostId: v.id,
      postType: null,
      publishedAt: v.publishedAt || null,
      likes: v.likes || 0,
      comments: v.comments || 0,
      shares: v.shares || 0,
      views: v.views || 0,
      captionSnippet: v.title || null,
      thumbnailUrl: v.thumbnailUrl || null,
      postUrl: v.postUrl || null,
      metrics: { duration: v.duration || 0 }
    }));

    await upsertPostMetricsDaily(brandId, socialAccountId, PLATFORMS.TIKTOK, rows);
  }

  /** Walks the cursor from the start, stopping at whichever comes first: a
   * video older than the brand's plan-based history window, or a hard
   * MAX_PAGE_COUNT cap (every plan gets a ceiling — an old, prolific channel
   * could still mean many sequential API calls even on the highest tier). */
  async _fetchRecentWindow(brandId, account) {
    const MAX_PAGE_COUNT = 20; // 20 pages * 20 videos/page = 400 videos max, regardless of plan.
    const windowMonths = await getHistoryWindowMonths(brandId);
    const recentCutoff = new Date();
    recentCutoff.setMonth(recentCutoff.getMonth() - windowMonths);

    let cursor = 0;
    let videos = [];
    let hasMore = true;
    let pageCount = 0;

    while (hasMore && pageCount < MAX_PAGE_COUNT) {
      // TikTok enforces 600 requests/minute app-wide on this endpoint (HTTP
      // 429 rate_limit_exceeded past that) — back off before actually
      // tripping it, since this loop can burn several calls per single
      // brand's tab open, and several brands could open tabs concurrently.
      if (await this._isNearMinuteQuota()) {
        logger.warn('[TikTok Video] Backing off _fetchRecentWindow: approaching TikTok\'s per-minute rate limit.');
        break;
      }

      pageCount += 1;
      const response = await this._getVideoListWithRefresh(account, cursor, 20);
      const pageVideos = response?.videos ? this._formatVideoList(response.videos) : [];
      if (pageVideos.length === 0) break;

      // TikTok returns videos newest-first, so once one video in a page is
      // older than the cutoff, every video after it (this page and all
      // subsequent pages) is guaranteed older too — safe to stop instead of
      // walking the rest of the channel's history.
      const cutoffIndex = pageVideos.findIndex(v => v.publishedAt && v.publishedAt < recentCutoff);
      if (cutoffIndex === -1) {
        videos = videos.concat(pageVideos);
        hasMore = Boolean(response.has_more);
        cursor = response.cursor || 0;
      } else {
        videos = videos.concat(pageVideos.slice(0, cutoffIndex));
        hasMore = false;
      }
    }

    return { videos, nextPageToken: null, prevPageToken: null };
  }

  /** Best-effort check — quota tracking failures never block the actual API
   * call, only inform whether _fetchRecentWindow's loop should keep going. */
  async _isNearMinuteQuota() {
    try {
      const usage = await quotaService.incrementAndGetMinute(TIKTOK_VIDEO_LIST_QUOTA_SERVICE, 0);
      return usage >= QUOTA_TTL_STRATEGY.TIKTOK_VIDEO_LIST.MINUTE_LIMIT;
    } catch (err) {
      logger.warn(`[TikTok Video] Minute-quota check failed, proceeding without backoff: ${err.message}`);
      return false;
    }
  }

  async _getVideoListWithRefresh(account, cursor, maxCount) {
    quotaService.incrementAndGetMinute(TIKTOK_VIDEO_LIST_QUOTA_SERVICE, 1).catch(err => {
      logger.warn(`[TikTok Video] Minute-quota increment failed: ${err.message}`);
    });
    try {
      return await tiktokGateway.getVideoList(account.accessToken, cursor, maxCount);
    } catch (error) {
      // Force refresh if the token is invalid (even if database metadata said it was valid)
      const isTokenError = error.status === 401 || error.code === 'access_token_invalid';
      if (isTokenError && account.refreshToken) {
        logger.debug(`[TikTok Video] getVideoList failed with token error. Attempting force refresh...`);
        const refreshed = await tiktokGateway.refreshAccessToken(account.refreshToken);
        const accessToken = refreshed.access_token;
        const refreshToken = refreshed.refresh_token || account.refreshToken;
        const expiryDate = refreshed.expires_in ? Date.now() + (refreshed.expires_in * 1000) : null;

        const updatedAccount = await socialAccountRepository.updateTokens(account.id, {
          access_token: accessToken,
          refresh_token: refreshToken,
          expiry_date: expiryDate
        });
        account.accessToken = updatedAccount.accessToken;
        account.refreshToken = updatedAccount.refreshToken;

        return await tiktokGateway.getVideoList(account.accessToken, cursor, maxCount);
      }
      throw error;
    }
  }

  // Display-only narrowing on top of whatever page of live results was
  // already fetched — see FacebookPostService#_filterByDateRange for the
  // same pattern (TikTok has no DB-first cache/historyWindowMonths gate at
  // this layer, so this is the only date filtering applied here).
  _filterByDateRange(videos, startDate, endDate) {
    if (!startDate && !endDate) return videos;
    return (videos || []).filter((video) => {
      if (!video.publishedAt) return true;
      const videoTime = new Date(video.publishedAt).getTime();
      if (startDate && videoTime < new Date(startDate).getTime()) return false;
      if (endDate && videoTime > new Date(endDate).getTime() + 24 * 60 * 60 * 1000 - 1) return false;
      return true;
    });
  }

  async _getAccount(brandId, socialAccountId = null) {
    let account;
    if (socialAccountId) {
      // findById looks up by raw ID with no brand scoping — a caller-supplied
      // socialAccountId could belong to a different brand than the one the
      // caller is authorized for, so verify ownership explicitly (IDOR guard),
      // same as facebook-post.service.js#_getAccountCredentials.
      account = await socialAccountRepository.findById(socialAccountId);
      if (account && String(account.brandId) !== String(brandId)) {
        account = null;
      }
    } else {
      const socialAccount = await socialAccountRepository.findByBrandAndPlatform(brandId, PLATFORMS.TIKTOK);
      if (!socialAccount || socialAccount.length === 0) {
        throw new Error('TikTok account not connected');
      }
      account = socialAccount[0];
    }
    if (!account) {
      throw new Error('TikTok account not connected');
    }
    return account;
  }

  _formatVideoList(videos) {
    return videos.map(v => ({
      id: v.id,
      title: v.title || v.video_description,
      thumbnailUrl: v.cover_image_url,
      publishedAt: new Date(v.create_time * 1000), // TikTok uses unix timestamp in seconds
      views: v.view_count || 0,
      likes: v.like_count || 0,
      comments: v.comment_count || 0,
      shares: v.share_count || 0,
      duration: v.duration || 0,
      status: POST_STATUS.PUBLISHED,
      platform: 'TIKTOK',
      postUrl: v.share_url || `https://www.tiktok.com/video/${v.id}`,
      shareUrl: v.share_url || `https://www.tiktok.com/video/${v.id}`
    }));
  }
}

module.exports = new TikTokVideoService();
