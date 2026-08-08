const youtubeGateway = require('./youtube.gateway');
const googleOAuthService = require('../google-oauth.service');
const socialAccountRepository = require('../../../repositories/social/social-account.repository');
const competitorRepository = require('../../../repositories/social/competitor.repository');
const postInsightRepository = require('../../../repositories/social/post-insight.repository');
const prisma = require('../../../config/prisma');
const { eventEmitter, EVENTS } = require('../../../events/event-emitter');
const { PLATFORMS, SEPARATORS, ANALYTICS, SOCIAL_TECHNICAL, YT_VIDEO_INSIGHTS } = require('../../../utils/constants');
const { YOUTUBE_QUOTA_THRESHOLD, YOUTUBE_DAILY_QUOTA_LIMIT } = ANALYTICS;
const { postInsightFacade } = require('../../../core/insights');
const logger = require('../../../utils/logger');

// getPostInsights' DB-first staleness window — YouTube Analytics data
// itself lags 24-48h at the source, so re-fetching more often than this
// would just call the live API for data that hasn't actually changed yet.
const POST_INSIGHTS_STALENESS_MS = 24 * 60 * 60 * 1000;

let redisClient = null;
try {
  redisClient = require('../../../config/redis');
} catch (_) {
  // Redis không có — video-insights vẫn hoạt động nhưng không cache
}

const QuotaTrackerService = require('../quota-tracker.service');
const YOUTUBE_QUOTA_SERVICE_NAME = 'youtube-analytics';
const quotaService = redisClient ? new QuotaTrackerService(redisClient) : null;

class YouTubeAnalyticsService {
  _createAuthenticatedClient(account) {
    const client = googleOAuthService.createClient();
    client.setCredentials({
      access_token: account.accessToken,
      refresh_token: account.refreshToken,
      expiry_date: account.tokenExpiresAt ? account.tokenExpiresAt.getTime() : undefined
    });

    // Check if token is expired and refresh if necessary
    client.on('tokens', async (tokens) => {
      try {
        if (tokens.refresh_token) {
          await socialAccountRepository.updateTokens(account.id, tokens);
        } else if (tokens.access_token) {
          await socialAccountRepository.updateTokens(account.id, {
            ...tokens,
            refresh_token: account.refreshToken
          });
        }
      } catch (err) {
        logger.warn(`[YouTubeAnalyticsService] Error updating tokens for account ${account.id}: ${err.message}`);
      }
    });

    return client;
  }

  _getEmptyChannelInfo(account = null) {
    const existingUploadsPlaylistId = account?.youtubeChannel?.uploadsPlaylistId;
    return {
      channelId: account?.platformAccountId || 'mock-youtube-channel-id',
      username: account?.username || '@youtube_channel',
      displayName: account?.displayName || 'YouTube Channel',
      profilePictureUrl: account?.profilePictureUrl || 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=150&auto=format&fit=crop&q=60',
      statistics: {
        viewCount: '0',
        subscriberCount: '0',
        videoCount: '0',
        hiddenSubscriberCount: false
      },
      snippet: {
        title: account?.displayName || 'YouTube Channel',
        description: 'No data available',
        customUrl: account?.username || '',
        publishedAt: new Date().toISOString(),
        thumbnails: {
          default: { url: account?.profilePictureUrl || 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=150&auto=format&fit=crop&q=60' }
        }
      },
      analytics: {
        demographics: [],
        trafficSource: [],
        geographic: [],
        growth: []
      },
      uploadsPlaylistId: (existingUploadsPlaylistId && existingUploadsPlaylistId !== 'mock-uploads-playlist-id') ? existingUploadsPlaylistId : 'mock-uploads-playlist-id'
    };
  }

  _getMockGrowthData() {
    return [];
  }

  async getChannelInfo(auth, startDate, endDate, account = null) {
    const accessToken = auth?.credentials?.access_token;
    if (accessToken && accessToken.startsWith('mock-')) {
      return this._getEmptyChannelInfo(account);
    }

    const fetchRealData = async () => {
      const response = await youtubeGateway.getChannelList(auth, true);

      if (!response.data.items || response.data.items.length === 0) {
        throw new Error('No YouTube channel found for this account');
      }

      const channel = response.data.items[0];
      const analyticsData = await this.getAnalyticsReport(auth, startDate, endDate);

      return {
        channelId: channel.id,
        username: channel.snippet.customUrl || channel.snippet.title,
        displayName: channel.snippet.title,
        profilePictureUrl: channel.snippet.thumbnails.default.url,
        statistics: channel.statistics,
        snippet: channel.snippet,
        analytics: analyticsData,
        uploadsPlaylistId: channel.contentDetails.relatedPlaylists.uploads
      };
    };

    // Helper: Wrap promise with a timeout rejection
    const withTimeout = (promise, ms = 60000) => {
      let timeoutId;
      const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error('Google API request timeout (60000ms) exceeded'));
        }, ms);
      });
      return Promise.race([promise, timeoutPromise]).finally(() => {
        clearTimeout(timeoutId);
      });
    };

    try {
      return await withTimeout(fetchRealData(), 60000);
    } catch (error) {
      if (error.message === 'No YouTube channel found for this account') {
        throw error;
      }

      // A genuine auth failure (refresh token revoked/expired by the user or
      // Google) was previously swallowed into the same silent empty-data
      // fallback as a transient timeout/network error, masking the real
      // problem — the account looked like it just had "no data" instead of
      // needing to be reconnected (#70). Only truly transient failures
      // should fall back silently; auth failures must propagate so the
      // caller (e.g. the sync scheduler) can mark the account disconnected.
      const { parseGoogleApiError } = require('./youtube-error.util');
      const { status, reason } = parseGoogleApiError(error);
      const errMsg = error.message ? error.message.toLowerCase() : '';
      const isAuthError = status === 401 || reason === 'authError' || reason === 'unauthorized' || reason === 'invalid_grant'
        || error.code === 'invalid_grant' || error.code === 401
        || errMsg.includes('invalid_grant') || errMsg.includes('invalid credentials')
        || errMsg.includes('unauthorized') || errMsg.includes('401');
      if (isAuthError) {
        console.error(`[YouTube Analytics] Authentication failure for account ${account?.id}: ${error.message}`);
        throw error;
      }

      console.warn(`[YouTube Analytics] API call failed or timed out (${error.message}). Falling back to empty data...`);
      return this._getEmptyChannelInfo(account);
    }
  }

  async getAnalyticsReport(auth, startDate, endDate) {
    const accessToken = auth?.credentials?.access_token;
    if (accessToken && accessToken.startsWith('mock-')) {
      return {
        demographics: [],
        trafficSource: [],
        geographic: [],
        growth: []
      };
    }

    try {
      const { start, end } = this._resolveDates(startDate, endDate);
 
      // Fetch multiple analytics reports in parallel
      const [demoRes, trafficRes, geoRes, growthRes] = await Promise.all([
        this._fetchDemographics(auth, start, end).catch(err => {
          console.warn('[YouTube Analytics] Failed to fetch demographics, using empty fallback:', err.message);
          return { data: { rows: [] } };
        }),
        this._fetchTrafficSource(auth, start, end).catch(err => {
          console.warn('[YouTube Analytics] Failed to fetch traffic sources, using empty fallback:', err.message);
          return { data: { rows: [] } };
        }),
        this._fetchGeographic(auth, start, end).catch(err => {
          console.warn('[YouTube Analytics] Failed to fetch geographic data, using empty fallback:', err.message);
          return { data: { rows: [] } };
        }),
        this._fetchGrowth(auth, start, end).catch(err => {
          console.warn('[YouTube Analytics] Failed to fetch growth data, using empty fallback:', err.message);
          return { data: { rows: [] } };
        })
      ]);
 
      const videosPerDay = await this._fetchUploadsPerDay(auth, start, end);
      const growthData = this._formatGrowthData(growthRes?.data?.rows || [], start, end, videosPerDay);

      let demographics = demoRes?.data?.rows || [];
      let trafficSource = trafficRes?.data?.rows || [];
      let geographic = geoRes?.data?.rows || [];
 
      return {
        demographics,
        trafficSource,
        geographic,
        growth: growthData
      };
    } catch (error) {
      console.error('Error fetching YouTube Analytics:', error.message);
      return null;
    }
  }

  _resolveDates(startDate, endDate) {
    const defaultStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const defaultEnd = new Date().toISOString().split('T')[0];
    let start = startDate || defaultStart;
    let end = endDate || defaultEnd;

    if (start === end) {
      const prevDate = new Date(new Date(start).getTime() - 24 * 60 * 60 * 1000);
      start = prevDate.toISOString().split('T')[0];
    }

    return { start, end };
  }

  async _fetchDemographics(auth, start, end) {
    const metrics = ANALYTICS.METRICS.YOUTUBE.VIEWER_PERCENTAGE;
    const dimensions = `${ANALYTICS.DIMENSIONS.YOUTUBE.AGE_GROUP},${ANALYTICS.DIMENSIONS.YOUTUBE.GENDER}`;
    return youtubeGateway.getAnalyticsReportQuery(auth, {
      ids: 'channel==MINE',
      startDate: start,
      endDate: end,
      metrics,
      dimensions,
      sort: dimensions
    });
  }

  async _fetchTrafficSource(auth, start, end) {
    return youtubeGateway.getAnalyticsReportQuery(auth, {
      ids: 'channel==MINE',
      startDate: start,
      endDate: end,
      metrics: `${ANALYTICS.METRICS.YOUTUBE.VIEWS},${ANALYTICS.METRICS.YOUTUBE.MINUTES_WATCHED}`,
      dimensions: ANALYTICS.DIMENSIONS.YOUTUBE.TRAFFIC_SOURCE,
      sort: ANALYTICS.SORT.YOUTUBE.VIEWS_DESC
    });
  }

  async _fetchGeographic(auth, start, end) {
    return youtubeGateway.getAnalyticsReportQuery(auth, {
      ids: 'channel==MINE',
      startDate: start,
      endDate: end,
      metrics: ANALYTICS.METRICS.YOUTUBE.VIEWS,
      dimensions: ANALYTICS.DIMENSIONS.YOUTUBE.COUNTRY,
      sort: ANALYTICS.SORT.YOUTUBE.VIEWS_DESC,
      maxResults: 10
    });
  }

  async _fetchGrowth(auth, start, end) {
    return youtubeGateway.getAnalyticsReportQuery(auth, {
      ids: 'channel==MINE',
      startDate: start,
      endDate: end,
      metrics: `${ANALYTICS.METRICS.YOUTUBE.VIEWS},${ANALYTICS.METRICS.YOUTUBE.LIKES},${ANALYTICS.METRICS.YOUTUBE.COMMENTS},${ANALYTICS.METRICS.YOUTUBE.SUBSCRIBERS_GAINED},${ANALYTICS.METRICS.YOUTUBE.SUBSCRIBERS_LOST}`,
      dimensions: ANALYTICS.DIMENSIONS.YOUTUBE.DAY,
      sort: ANALYTICS.SORT.YOUTUBE.DAY_ASC
    });
  }

  async _fetchUploadsPerDay(auth, start, end) {
    const videosPerDay = {};
    try {
      const channelRes = await youtubeGateway.getChannelList(auth, true);
      const uploadsPlaylistId = channelRes.data.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
      
      if (uploadsPlaylistId) {
        // Fetch items from the 'uploads' playlist. 
        // Note: For large channels we might need pagination, 
        // but for counting recent uploads (30 days), 50 results is usually enough.
        const playlistRes = await youtubeGateway.getPlaylistItems(auth, uploadsPlaylistId, 50);
        
        if (playlistRes.data.items) {
          playlistRes.data.items.forEach(item => {
            const publishedAt = item.contentDetails?.videoPublishedAt || item.snippet.publishedAt;
            if (publishedAt) {
              const dateStr = new Date(publishedAt).toISOString().split('T')[0];
              if (dateStr >= start && dateStr <= end) {
                videosPerDay[dateStr] = (videosPerDay[dateStr] || 0) + 1;
              }
            }
          });
        }
      }
    } catch (err) {
      console.error('[YouTube Analytics] Failed to fetch upload counts:', err.message);
    }
    return videosPerDay;
  }

  _formatGrowthData(rows, start, end, videosPerDay) {
    const dailyMap = {};
    const startMs = new Date(start + 'T00:00:00Z').getTime();
    const endMs = new Date(end + 'T00:00:00Z').getTime();
    
    for (let t = startMs; t <= endMs; t += 24 * 60 * 60 * 1000) {
      const d = new Date(t).toISOString().split('T')[0];
      dailyMap[d] = {
        date: d,
        views: 0,
        likes: 0,
        comments: 0,
        subscribersGained: 0,
        subscribersLost: 0,
        totalContent: videosPerDay[d] || 0
      };
    }

    rows.forEach(row => {
      const d = row[0];
      if (dailyMap[d]) {
        dailyMap[d].views = row[1];
        dailyMap[d].likes = row[2];
        dailyMap[d].comments = row[3];
        dailyMap[d].subscribersGained = row[4];
        dailyMap[d].subscribersLost = row[5];
      }
    });

    return Object.keys(dailyMap).sort().map(d => dailyMap[d]);
  }

  async connectChannel(brandId, code, redirectUri) {
    const tokens = await googleOAuthService.getTokens(code, redirectUri);
    const client = googleOAuthService.createClient(redirectUri);
    client.setCredentials(tokens);

    // Backfill the brand's full plan-based history window on first connect
    // (not just the default 30 days) — upsertYouTubeChannelSnapshots explodes
    // this into one row per real day, so the growth chart has real history
    // immediately instead of accumulating one row per future sync.
    const { getHistoryWindowMonths } = require('../plan-history-window.util');
    const windowMonths = await getHistoryWindowMonths(brandId);
    const backfillStart = new Date();
    backfillStart.setMonth(backfillStart.getMonth() - windowMonths);
    const startDate = backfillStart.toISOString().split('T')[0];
    const endDate = new Date().toISOString().split('T')[0];

    const channelData = await this.getChannelInfo(client, startDate, endDate);

    const { ConnectionConflictGuard, ConnectionConflictError } = require('../connection-conflict.guard');
    const conflictResult = await ConnectionConflictGuard.validateConflict(brandId, PLATFORMS.YOUTUBE, channelData.channelId);
    
    if (conflictResult.conflict) {
      throw new ConnectionConflictError(
        conflictResult.type,
        channelData.displayName,
        channelData.channelId,
        PLATFORMS.YOUTUBE,
        conflictResult.existingAccount.brand.name
      );
    }
    
    return socialAccountRepository.upsertYouTubeAccount(brandId, channelData, tokens);
  }

  async syncChannelMetrics(socialAccountId, startDate, endDate) {
    const account = await socialAccountRepository.findById(socialAccountId);
    if (!account || account.platform !== PLATFORMS.YOUTUBE) {
      throw new Error('Social account not found or is not a YouTube account');
    }

    if (account.accessToken && account.accessToken.startsWith('mock-')) {
      logger.debug(`[YouTube Analytics] Mock token detected: ${account.accessToken}. Skipping Google API sync.`);
      return account;
    }

    const client = this._createAuthenticatedClient(account);

    const channelData = await this.getChannelInfo(client, startDate, endDate, account);
    
    // enqueueSync: false — đây CHÍNH LÀ sync job đang chạy; ghi outbox ở đây sẽ tự
    // enqueue thêm 1 sync job mới, tạo vòng lặp sync vô hạn (đã xảy ra thật trong dev).
    return socialAccountRepository.upsertYouTubeAccount(account.brandId, channelData, {
      access_token: client.credentials.access_token,
      refresh_token: client.credentials.refresh_token,
      expiry_date: client.credentials.expiry_date
    }, { enqueueSync: false });
  }

  async addCompetitor(brandId, channelId) {
    if (!channelId) throw new Error('channelId is required');

    const isValidChannelId = /^UC[\w-]{22}$/.test(channelId) || channelId.startsWith('@');
    if (!isValidChannelId) {
      throw new Error(`Invalid YouTube channel ID or handle format: ${channelId}`);
    }

    const socialAccount = await socialAccountRepository.findByBrandAndPlatform(brandId, PLATFORMS.YOUTUBE);
    if (!socialAccount || socialAccount.length === 0) throw new Error('YouTube account not connected');

    const activeAccount = socialAccount.find(acc => 
      !(acc.accessToken && acc.accessToken.startsWith('mock-')) &&
      !(acc.platformAccountId && acc.platformAccountId.startsWith('mock-'))
    ) || socialAccount[0];
    const auth = this._createAuthenticatedClient(activeAccount);

    let channel;
    try {
      const response = await youtubeGateway.getChannelList(auth, false, channelId);
      if (!response.data.items || response.data.items.length === 0) {
        throw new Error('Channel not found');
      }
      channel = response.data.items[0];
    } catch (err) {
      console.warn(`[YouTubeCompetitor] Failed to fetch channel info for ${channelId}: ${err.message}. Using mock fallback.`);
      // Mock fallback data
      return competitorRepository.createCompetitor(brandId, PLATFORMS.YOUTUBE, {
        competitorHandle: channelId,
        competitorDisplayName: `YouTube Channel (${channelId})`,
        competitorAvatarUrl: "",
        followersCount: 0
      });
    }

    return competitorRepository.createCompetitor(brandId, PLATFORMS.YOUTUBE, {
      competitorHandle: channel.snippet.customUrl || channel.id,
      competitorDisplayName: channel.snippet.title,
      competitorAvatarUrl: channel.snippet.thumbnails.medium?.url || channel.snippet.thumbnails.default.url,
      followersCount: parseInt(channel.statistics.subscriberCount) || 0
    });
  }

  async getCompetitors(brandId) {
    const competitors = await competitorRepository.getCompetitors(brandId, PLATFORMS.YOUTUBE);
    if (!competitors || competitors.length === 0) return [];

    const socialAccount = await socialAccountRepository.findByBrandAndPlatform(brandId, PLATFORMS.YOUTUBE);
    if (!socialAccount || socialAccount.length === 0) return competitors;

    const activeAccount = socialAccount.find(acc => 
      !(acc.accessToken && acc.accessToken.startsWith('mock-')) &&
      !(acc.platformAccountId && acc.platformAccountId.startsWith('mock-'))
    ) || socialAccount[0];
    const auth = this._createAuthenticatedClient(activeAccount);

    // Enrich each competitor with YouTube API data
    const enrichedCompetitors = await Promise.all(competitors.map(async (comp) => {
      const plainComp = JSON.parse(JSON.stringify(comp));
      try {
        const channelRes = await youtubeGateway.getChannelList(auth, false, comp.competitorHandle);
        if (!channelRes.data.items || channelRes.data.items.length === 0) {
          return {
            ...plainComp,
            totalViews: 0,
            totalVideos: 0,
            latestVideos: []
          };
        }

        const channel = channelRes.data.items[0];
        const uploadsPlaylistId = channel.contentDetails?.relatedPlaylists?.uploads;
        const totalViews = parseInt(channel.statistics?.viewCount) || 0;
        const totalVideos = parseInt(channel.statistics?.videoCount) || 0;
        const followersCount = parseInt(channel.statistics?.subscriberCount) || 0;

        let latestVideos = [];
        if (uploadsPlaylistId) {
          const playlistRes = await youtubeGateway.getPlaylistItems(auth, uploadsPlaylistId, 50);
          if (playlistRes.data.items && playlistRes.data.items.length > 0) {
            const videoIds = playlistRes.data.items.map(item => item.contentDetails.videoId).join(SEPARATORS.COMMA);
            const videoDetails = await youtubeGateway.getVideosList(auth, videoIds);
            latestVideos = videoDetails.data.items.map(v => ({
              id: v.id,
              title: v.snippet.title,
              thumbnailUrl: v.snippet.thumbnails.medium?.url || v.snippet.thumbnails.default.url,
              publishedAt: v.snippet.publishedAt,
              views: parseInt(v.statistics.viewCount) || 0,
              likes: parseInt(v.statistics.likeCount) || 0,
              comments: parseInt(v.statistics.commentCount) || 0,
            }));
          }
        }

        return {
          ...plainComp,
          followersCount,
          totalViews,
          totalVideos,
          latestVideos
        };
      } catch (err) {
        console.error(`Failed to enrich competitor ${comp.competitorHandle}:`, err.message);
        return {
          ...plainComp,
          totalViews: 0,
          totalVideos: 0,
          latestVideos: []
        };
      }
    }));

    return enrichedCompetitors;
  }

  async getVideoAnalytics(brandId, videoId, startDate, endDate) {
    const { start, end } = this._resolveDates(startDate, endDate);

    if (await this._isQuotaBudgetExceeded()) {
      console.warn(`[YouTube Analytics] Quota budget below threshold, returning quotaExceeded fallback for video ${videoId}.`);
      return this._getMockVideoAnalytics(start, end, true);
    }

    try {
      const socialAccount = await socialAccountRepository.findByBrandAndPlatform(brandId, PLATFORMS.YOUTUBE);
      if (!socialAccount || socialAccount.length === 0) {
        return this._getMockVideoAnalytics(start, end);
      }

      const activeAccount = socialAccount.find(acc =>
        !(acc.accessToken && acc.accessToken.startsWith('mock-')) &&
        !(acc.platformAccountId && acc.platformAccountId.startsWith('mock-'))
      ) || socialAccount[0];
      const auth = this._createAuthenticatedClient(activeAccount);

      const response = await youtubeGateway.getAnalyticsReportQuery(auth, {
        ids: 'channel==MINE',
        startDate: start,
        endDate: end,
        metrics: 'views,likes,comments,averageViewDuration',
        dimensions: ANALYTICS.DIMENSIONS.YOUTUBE.DAY,
        filters: `${ANALYTICS.DIMENSIONS.YOUTUBE.VIDEO}==${videoId}`,
        sort: ANALYTICS.SORT.YOUTUBE.DAY_ASC
      });
      await this._recordQuotaUsage();

      let rows = response.data.rows;
      if (!rows || rows.length === 0) {
        return this._getMockVideoAnalytics(start, end);
      }



      return rows.map(row => ({
        date: row[0],
        views: parseInt(row[1]) || 0,
        likes: parseInt(row[2]) || 0,
        comments: parseInt(row[3]) || 0,
        avgWatchTime: parseInt(row[4]) || 0
      }));
    } catch (err) {
      console.error("Error in getVideoAnalytics, returning mock fallback:", err.message);
      return this._getMockVideoAnalytics(start, end, true);
    }
  }

  async _isQuotaBudgetExceeded() {
    if (!quotaService) return false;
    try {
      const usage = await quotaService.getCurrentUsage(YOUTUBE_QUOTA_SERVICE_NAME);
      // YOUTUBE_QUOTA_THRESHOLD (1500) is a remaining-budget floor out of the
      // real 10000-unit daily cap — fire once usage climbs within that floor
      // of the limit. The previous `* 10` compared usage against 15000, a
      // threshold above the real daily cap, so Google's own 403 quotaExceeded
      // always hit first and this guard never fired (#67).
      return usage >= YOUTUBE_DAILY_QUOTA_LIMIT - YOUTUBE_QUOTA_THRESHOLD;
    } catch (err) {
      console.error('[YouTube Analytics] Quota check failed, proceeding without guard:', err.message);
      return false;
    }
  }

  async _recordQuotaUsage() {
    if (!quotaService) return;
    try {
      await quotaService.incrementAndGet(YOUTUBE_QUOTA_SERVICE_NAME, 1);
    } catch (err) {
      console.error('[YouTube Analytics] Failed to record quota usage:', err.message);
    }
  }



  /**
   * @param {boolean} isFallback - true when this represents a failed/quota-blocked API
   * call being masked as zeros, NOT a video that genuinely has 0 views. Callers that
   * persist these rows (e.g. sync-post-analytics.service.js) must check this flag and
   * skip persisting isEstimated=false rows built from a fallback response.
   */
  _getMockVideoAnalytics(start, end, isFallback = false) {
    const rows = [];
    const sDate = new Date(start);
    const eDate = new Date(end);

    for (let d = new Date(sDate); d <= eDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      rows.push({
        date: dateStr,
        views: 0,
        likes: 0,
        comments: 0,
        avgWatchTime: 0,
        isFallback
      });
    }
    return rows;
  }

  // ────────────────────────────────────────────────────────────
  // VIDEO INSIGHTS (basic lifetime video analytics)
  // ────────────────────────────────────────────────────────────

  /**
   * Lấy 6 chỉ số phân tích cơ bản của 1 post/video YouTube cụ thể.
   * Uỷ quyền trực tiếp sang postInsightFacade (Facade Pattern).
   */
  async getPostInsights(brandId, videoId) {
    return postInsightFacade.getPostInsights(brandId, PLATFORMS.YOUTUBE, videoId);
  }

  /** Chuyển country code → flag emoji */
  _countryCodeToFlag(code) {
    if (!code || code.length !== 2) return '📍';
    return code.toUpperCase().split('').map(c => String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65)).join('');
  }

  /**
   * Country code → tên nước.
   * Dùng YT_VIDEO_INSIGHTS.COUNTRY_NAMES để tách data ra khỏi logic,
   * nhất quán với pattern lookup của TRAFFIC_SOURCE và DEVICE_TYPE.
   */
  _countryName(code) {
    return YT_VIDEO_INSIGHTS.COUNTRY_NAMES[code] || code;
  }

  async deleteCompetitor(id, brandId, userId) {
    const competitor = await competitorRepository.findById(id);
    if (!competitor) {
      const error = new Error('Competitor not found');
      error.statusCode = 404;
      throw error;
    }

    // brandId here comes from the caller's request, not yet verified —
    // cross-check it against the competitor's real brand before trusting it,
    // then verify the caller actually belongs to that brand.
    if (competitor.brandId !== brandId) {
      const error = new Error('Competitor not found');
      error.statusCode = 404;
      throw error;
    }

    const authorizationFacade = require('../../auth/authorization.facade');
    const hasAccess = await authorizationFacade.checkBrandAccess(userId, brandId);
    if (!hasAccess) {
      const error = new Error('Bạn không có quyền truy cập thương hiệu này.');
      error.statusCode = 403;
      throw error;
    }

    return competitorRepository.deleteCompetitor(id);
  }
}

module.exports = new YouTubeAnalyticsService();
