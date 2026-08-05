const tiktokGateway = require('./tiktok.gateway');
const tiktokAnalytics = require('./tiktok-analytics.service');
const socialAccountRepository = require('../../../repositories/social/social-account.repository');
const brandRepository = require('../../../repositories/workspace/brand.repository');
const QuotaTrackerService = require('../quota-tracker.service');
const { PLATFORMS, POST_STATUS, QUOTA_TTL_STRATEGY } = require('../../../utils/constants');
const logger = require('../../../utils/logger');

let redisClient = null;
try {
  redisClient = require('../../../config/redis');
} catch (_) {
  // Redis not available — minute-quota tracking is skipped, same fallback
  // pattern as youtube.gateway.js.
}

const TIKTOK_VIDEO_LIST_QUOTA_SERVICE = 'tiktok-video-list';

// Fallback when a brand has no active subscription (e.g. lapsed/cancelled) —
// the most conservative (FREE-tier) window, same spirit as the hardcoded
// fallbacks other services use when planLimit is unavailable (e.g.
// team.service.js's `|| 5` seat cap).
const DEFAULT_HISTORY_WINDOW_MONTHS = 1;

class TikTokVideoService {
  constructor() {
    this.quotaService = redisClient ? new QuotaTrackerService(redisClient) : null;
  }

  async getPublishedVideos(brandId, pageToken = 0, limit = 10, socialAccountId = null, startDate = null, endDate = null) {
    try {
      let account = await this._getAccount(brandId, socialAccountId);

      if (account && (
        (account.accessToken && account.accessToken.startsWith('mock-')) ||
        (account.platformAccountId && account.platformAccountId.startsWith('mock-'))
      )) {
        return { videos: [], nextPageToken: null, prevPageToken: null };
      }

      // Get fresh token if expired based on metadata
      account = await tiktokAnalytics.getOrRefreshAccount(account);

      // A date-range filter narrows what's shown, but a single limit=10
      // page fetched from the newest-first cursor may not contain anything
      // from an older range at all (or only part of it) — filtering after
      // the fact on that one page silently undercounts instead of showing
      // everything actually published in the range. When a range was
      // requested and this is the initial load (no explicit pageToken —
      // that always means a real UI "next page" click, single page only),
      // walk pages until the range is covered, same MAX_PAGE_COUNT-bounded
      // pattern used by Facebook/Instagram/Threads' analytics feed walk.
      if ((startDate || endDate) && !pageToken) {
        return await this._fetchDateRangeWindow(account, startDate, endDate);
      }

      // The initial load with no date range walks the cursor itself,
      // bounded by the brand's plan-based history window, instead of
      // returning just one 20-video page — TikTok's API has no date-range
      // filter, so "recent videos" only exists as "keep paging until
      // stale." An explicit pageToken (manual "next page" click) still
      // fetches exactly one page, so callers can keep paging past the
      // window if they choose.
      if (!pageToken) {
        return await this._fetchRecentWindow(brandId, account);
      }

      const cursor = parseInt(pageToken) || 0;
      const maxCount = parseInt(limit) || 10;
      const response = await this._getVideoListWithRefresh(account, cursor, maxCount);

      if (!response || !response.videos) {
        return { videos: [], nextPageToken: null, prevPageToken: null };
      }

      const formattedVideos = this._filterByDateRange(this._formatVideoList(response.videos), startDate, endDate);

      return {
        videos: formattedVideos,
        nextPageToken: response.has_more ? response.cursor.toString() : null,
        prevPageToken: cursor > 0 ? '0' : null // Simple fallback for prev token
      };
    } catch (err) {
      if (err.message.includes('TikTok account not connected')) {
        return { videos: [], nextPageToken: null, prevPageToken: null };
      }
      throw err;
    }
  }

  /** Walks the cursor from the start, stopping at whichever comes first: a
   * video older than the brand's plan-based history window, or a hard
   * MAX_PAGE_COUNT cap (every plan gets a ceiling — an old, prolific channel
   * could still mean many sequential API calls even on the highest tier). */
  async _fetchRecentWindow(brandId, account) {
    const MAX_PAGE_COUNT = 20; // 20 pages * 20 videos/page = 400 videos max, regardless of plan.
    const windowMonths = await this._getHistoryWindowMonths(brandId);
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

  async _getHistoryWindowMonths(brandId) {
    const brand = await brandRepository.findBrandWithSubscription(brandId);
    const planLimit = brand?.subscription?.status === 'ACTIVE' ? brand.subscription.plan?.planLimit : null;
    return planLimit?.historyWindowMonths || DEFAULT_HISTORY_WINDOW_MONTHS;
  }

  /** Best-effort check — quota tracking failures never block the actual API
   * call, only inform whether _fetchRecentWindow's loop should keep going. */
  async _isNearMinuteQuota() {
    if (!this.quotaService) return false;
    try {
      const usage = await this.quotaService.incrementAndGetMinute(TIKTOK_VIDEO_LIST_QUOTA_SERVICE, 0);
      return usage >= QUOTA_TTL_STRATEGY.TIKTOK_VIDEO_LIST.MINUTE_LIMIT;
    } catch (err) {
      logger.warn(`[TikTok Video] Minute-quota check failed, proceeding without backoff: ${err.message}`);
      return false;
    }
  }

  async _getVideoListWithRefresh(account, cursor, maxCount) {
    if (this.quotaService) {
      this.quotaService.incrementAndGetMinute(TIKTOK_VIDEO_LIST_QUOTA_SERVICE, 1).catch(err => {
        logger.warn(`[TikTok Video] Minute-quota increment failed: ${err.message}`);
      });
    }
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

  // Walks TikTok's cursor-paginated video list (newest-first) until either
  // the range is fully covered, the feed runs out, or a safety cap is hit —
  // see the comment at the getPublishedVideos call site for why a single
  // page isn't enough once a date range is in play.
  async _fetchDateRangeWindow(account, startDate, endDate) {
    const MAX_PAGE_COUNT = 10;
    const PAGE_SIZE = 20;
    // Small gap between pages so a 6-12 month window (up to 10 calls) reads
    // as normal traffic instead of a burst that trips TikTok's rate limit —
    // hit mid-walk before this existed (10 calls fired back-to-back), which
    // aborted the whole request and left the UI showing stale/no data.
    const PAGE_DELAY_MS = 300;
    const rangeStartMs = startDate ? new Date(startDate).getTime() : null;

    let allVideos = [];
    let cursor = 0;
    let hasMore = true;
    let pageCount = 0;

    while (hasMore && pageCount < MAX_PAGE_COUNT) {
      // Same per-minute backoff as _fetchRecentWindow — a date-range walk
      // can burn just as many sequential calls.
      if (await this._isNearMinuteQuota()) {
        logger.warn('[TikTok Video] Backing off _fetchDateRangeWindow: approaching TikTok\'s per-minute rate limit.');
        break;
      }

      pageCount += 1;
      let response;
      try {
        response = await this._getVideoListWithRefresh(account, cursor, PAGE_SIZE);
      } catch (err) {
        // Mid-walk failure (e.g. 429 rate limit): return whatever pages were
        // already collected instead of losing the whole range to one
        // transient error — a partial result is strictly better than none.
        logger.warn(`[TikTok Video] Date-range page walk stopped early at page ${pageCount}: ${err.message}`);
        break;
      }
      if (!response || !response.videos || response.videos.length === 0) break;

      allVideos = allVideos.concat(response.videos);

      const oldestInPage = response.videos[response.videos.length - 1];
      const oldestTimeMs = oldestInPage?.create_time ? oldestInPage.create_time * 1000 : null;
      const pageIsFullyBeforeRange = rangeStartMs && oldestTimeMs && oldestTimeMs < rangeStartMs;

      hasMore = Boolean(response.has_more) && !pageIsFullyBeforeRange;
      cursor = response.cursor;

      if (hasMore && pageCount < MAX_PAGE_COUNT) {
        await new Promise((resolve) => setTimeout(resolve, PAGE_DELAY_MS));
      }
    }

    const formattedVideos = this._filterByDateRange(this._formatVideoList(allVideos), startDate, endDate);
    return { videos: formattedVideos, nextPageToken: null, prevPageToken: null };
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
      account = await socialAccountRepository.findById(socialAccountId);
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
