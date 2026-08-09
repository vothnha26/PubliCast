const youtubeGateway = require('./youtube.gateway');
const googleOAuthService = require('../google-oauth.service');
const socialAccountRepository = require('../../../repositories/social/social-account.repository');
const trackedVideoRepository = require('../../../repositories/social/tracked-video.repository');
const { getHistoryWindowMonths } = require('../plan-history-window.util');
const videoPersistenceUtil = require('./youtube-video-persistence.util');
const { upsertPostMetricsDaily, findLatestPostMetrics } = require('../post-metric-daily-persistence.util');
const prisma = require('../../../config/prisma');
const { PLATFORMS, POST_STATUS, SEPARATORS, YOUTUBE_API } = require('../../../utils/constants');

class YouTubeVideoService {
  /**
   * Clamp a requested startDate to the brand's plan-based history window —
   * same enforcement Facebook/Instagram/TikTok/Threads already have via
   * their own _fetchRecentWindow/_fetchFromDbCache cutoffs, which this
   * method never had (it only bounded results by `limit`, a UI page-size
   * param with no relation to plan tier).
   */
  async _clampStartDate(brandId, startDate) {
    const windowMonths = await getHistoryWindowMonths(brandId);
    const earliestAllowed = new Date();
    earliestAllowed.setMonth(earliestAllowed.getMonth() - windowMonths);
    if (!startDate || new Date(startDate) < earliestAllowed) {
      return earliestAllowed.toISOString().split('T')[0];
    }
    return startDate;
  }

  // DB-only read — Smart Fetch: no live YouTube API call happens here.
  // forceSync is no longer honored (kept as a param for callers that still
  // pass it); pageToken beyond what Sync has cached returns empty rather
  // than falling back to a live fetch (accepted simplification).
  async getPublishedVideos(brandId, pageToken = null, limit = 10, socialAccountId = null, forceSync = false, startDate = null, endDate = null) {
    startDate = await this._clampStartDate(brandId, startDate);

    const rows = await findLatestPostMetrics(brandId, PLATFORMS.YOUTUBE, socialAccountId, parseInt(limit, 10) || 10);
    const videos = rows.map(r => this._formatDbMetricRow(r));

    return { videos: videoPersistenceUtil.filterByDateRange(videos, startDate, endDate), nextPageToken: null, prevPageToken: null, fromDb: true };
  }

  _formatDbMetricRow(row) {
    const m = row.metrics || {};
    return {
      id: row.platformPostId,
      title: row.captionSnippet || 'YouTube Video',
      thumbnailUrl: row.thumbnailUrl || '',
      publishedAt: row.publishedAt ? row.publishedAt.toISOString() : null,
      views: String(row.views || 0),
      likes: String(row.likes || 0),
      comments: String(row.comments || 0),
      duration: m.duration || null,
      status: POST_STATUS.PUBLISHED,
      privacyStatus: m.privacyStatus || 'public',
      platform: PLATFORMS.YOUTUBE,
      postUrl: row.postUrl || YOUTUBE_API.videoUrl(row.platformPostId),
      madeForKids: m.madeForKids ?? false
    };
  }

  // Smart Fetch Sync — the only method allowed to call YouTube's live Data
  // API for published videos. Called by the posts-sync scheduler webhook,
  // OAuth-connect-time backfill, and the manual-refresh endpoint. Still
  // upserts into Post/PostTarget (unchanged, feeds the publish pipeline)
  // in addition to the new PostMetricDaily read table.
  async syncPublishedVideos(brandId, socialAccountId, pageToken = null, limit = 50) {
    try {
      const { auth, account } = await this._getAuthContext(brandId, false, socialAccountId);
      const uploadsId = await this._resolveUploadsPlaylistId(auth, account);

      const playlistRes = await youtubeGateway.getPlaylistItems(auth, uploadsId, limit, pageToken);
      if (!playlistRes.data.items || playlistRes.data.items.length === 0) {
        return { synced: 0 };
      }

      const videoIds = playlistRes.data.items.map(item => item.contentDetails.videoId).join(SEPARATORS.COMMA);
      const videoDetails = await youtubeGateway.getVideosList(auth, videoIds);
      const formattedVideos = videoPersistenceUtil.formatVideoList(videoDetails.data.items);

      await videoPersistenceUtil.upsertPublishedVideosToDb(brandId, formattedVideos, account.id).catch(err => {
        console.warn('[YouTubeVideoService] Auto-upsert published videos failed:', err.message);
      });

      await this._persistVideoMetrics(brandId, account.id, formattedVideos);

      return { synced: formattedVideos.length };
    } catch (error) {
      if (error.message.includes('YouTube account not connected')) {
        return { synced: 0 };
      }
      throw error;
    }
  }

  async _persistVideoMetrics(brandId, socialAccountId, videos) {
    const rows = videos.map(v => ({
      platformPostId: v.id,
      postType: 'VIDEO',
      publishedAt: v.publishedAt ? new Date(v.publishedAt) : null,
      likes: parseInt(v.likes, 10) || 0,
      comments: parseInt(v.comments, 10) || 0,
      views: parseInt(v.views, 10) || 0,
      captionSnippet: v.title || null,
      thumbnailUrl: v.thumbnailUrl || null,
      postUrl: v.postUrl || null,
      metrics: {
        duration: v.duration || null,
        privacyStatus: v.privacyStatus || 'public',
        madeForKids: v.madeForKids ?? false
      }
    }));

    await upsertPostMetricsDaily(brandId, socialAccountId, PLATFORMS.YOUTUBE, rows);
  }

  async trackVideo(brandId, videoUrl) {
    const videoId = this.extractVideoId(videoUrl);
    if (!videoId) throw new Error('Invalid YouTube URL');

    const { auth } = await this._getAuthContext(brandId);
    const response = await youtubeGateway.getVideosList(auth, videoId);

    if (!response.data.items || response.data.items.length === 0) {
      throw new Error('Video not found');
    }

    const video = response.data.items[0];
    return trackedVideoRepository.upsertTrackedVideo(brandId, videoId, videoPersistenceUtil.prepareTrackedVideoData(video));
  }

  async getTrackedVideos(brandId) {
    return trackedVideoRepository.getTrackedVideos(brandId);
  }

  // DB-only for published posts (PostMetricDaily, Smart Fetch). Falls back
  // to the pre-existing TrackedVideo read-through cache for arbitrary
  // tracked URLs (trackVideo()'s own feature, not a "published post" read
  // path — out of Smart Fetch's scope) — that fallback still lazily
  // live-fetches on its own cache miss, unchanged from before.
  async getVideoDetails(brandId, videoId) {
    const isYouTubeId = typeof videoId === 'string' && /^[a-zA-Z0-9_-]{11}$/.test(videoId);

    const metricRow = await prisma.postMetricDaily.findFirst({
      where: { brandId, platformPostId: videoId, platform: PLATFORMS.YOUTUBE },
      orderBy: { snapshotDate: 'desc' }
    });
    if (metricRow) {
      const m = metricRow.metrics || {};
      return {
        id: metricRow.platformPostId,
        title: metricRow.captionSnippet || 'YouTube Video',
        description: m.description || '',
        thumbnailUrl: metricRow.thumbnailUrl || '',
        channelId: m.channelId || null,
        channelTitle: m.channelTitle || 'YouTube',
        subscriberCount: m.subscriberCount,
        viewCount: String(metricRow.views || 0),
        likeCount: String(metricRow.likes || 0),
        publishedAt: metricRow.publishedAt ? metricRow.publishedAt.toISOString() : undefined,
        madeForKids: m.madeForKids ?? false
      };
    }

    const cached = await trackedVideoRepository.findByBrandAndVideoId(brandId, videoId);
    if (cached) {
      return videoPersistenceUtil.formatTrackedVideoAsDetails(cached);
    }

    if (isYouTubeId) {
      return {
        id: videoId,
        title: `YouTube Video (${videoId})`,
        thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        channelTitle: "YouTube",
        publishedAt: new Date().toISOString()
      };
    }
    return null;
  }

  async searchChannel(brandId, query) {
    const { auth } = await this._getAuthContext(brandId);
    const response = await youtubeGateway.searchChannels(auth, query);

    return (response.data.items || []).map(item => ({
      channelId: item.id?.channelId || item.snippet?.channelId || item.id,
      title: item.snippet?.title || "YouTube Channel",
      description: item.snippet?.description || "",
      thumbnail: item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url || ""
    }));
  }

  async getPlaylists(brandId, forceRefresh = false, socialAccountId = null) {
    // Resolve the actual account first (even when socialAccountId wasn't
    // passed in) so the cache lookup/write below is keyed to the specific
    // channel being queried, not just the brand — otherwise a brand with
    // multiple YouTube channels could get one channel's playlists served
    // from another's cache.
    const { auth, account } = await this._getAuthContext(brandId, false, socialAccountId);
    const resolvedAccountId = account.id;

    if (!forceRefresh) {
      const cached = await prisma.youTubePlaylistCache.findMany({ where: { brandId, socialAccountId: resolvedAccountId } });
      if (cached.length > 0) return this._formatPlaylistRows(cached);
    }

    const playlists = [];
    let pageToken = null;

    do {
      const res = await youtubeGateway.getPlaylists(auth, 50, pageToken);
      if (res.data.items) {
        playlists.push(...res.data.items.map(item => ({
          id: item.id,
          title: item.snippet.title,
          description: item.snippet.description,
          itemCount: item.contentDetails.itemCount
        })));
      }
      pageToken = res.data.nextPageToken || null;
    } while (pageToken);

    await this._upsertPlaylistCache(brandId, resolvedAccountId, playlists);
    return playlists;
  }

  async _upsertPlaylistCache(brandId, socialAccountId, playlists) {
    await prisma.$transaction([
      prisma.youTubePlaylistCache.deleteMany({ where: { brandId, socialAccountId } }),
      prisma.youTubePlaylistCache.createMany({
        data: playlists.map(p => ({
          brandId,
          socialAccountId,
          playlistId: p.id,
          title: p.title,
          description: p.description,
          itemCount: p.itemCount
        }))
      })
    ]);
  }

  _formatPlaylistRows(rows) {
    return rows.map(r => ({
      id: r.playlistId,
      title: r.title,
      description: r.description,
      itemCount: r.itemCount
    }));
  }

  async getVideoCategories(brandId, forceRefresh = false, socialAccountId = null) {
    const { auth, account } = await this._getAuthContext(brandId, false, socialAccountId);
    const regionCode = account?.youtubeChannel?.country || 'US';

    if (!forceRefresh) {
      const cached = await prisma.youTubeVideoCategory.findMany({ where: { regionCode } });
      if (cached.length > 0) return this._formatCategoryRows(cached);
    }

    const res = await youtubeGateway.getVideoCategories(auth, regionCode);
    const items = res.data.items || [];

    const categories = items
      .filter(item => item.snippet && item.snippet.assignable === true)
      .map(item => ({
        id: item.id,
        title: item.snippet.title
      }));

    await this._upsertCategoryCache(regionCode, categories);
    return categories;
  }

  async _upsertCategoryCache(regionCode, categories) {
    await prisma.$transaction([
      prisma.youTubeVideoCategory.deleteMany({ where: { regionCode } }),
      prisma.youTubeVideoCategory.createMany({
        data: categories.map(c => ({
          regionCode,
          categoryId: c.id,
          title: c.title
        }))
      })
    ]);
  }

  _formatCategoryRows(rows) {
    return rows.map(r => ({ id: r.categoryId, title: r.title }));
  }

  async updateVideo(brandId, videoId, updates, socialAccountId = null) {
    const { auth } = await this._getAuthContext(brandId, false, socialAccountId);
    return await youtubeGateway.updateVideo(auth, videoId, updates);
  }

  // ============= Private Helper Methods =============

  async _getAuthContext(brandId, optional = false, socialAccountId = null) {
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
      const socialAccount = await socialAccountRepository.findByBrandAndPlatform(brandId, PLATFORMS.YOUTUBE);
      if (!socialAccount || socialAccount.length === 0) {
        if (optional) return { auth: null, account: null };
        throw new Error('YouTube account not connected');
      }
      account = socialAccount.find(acc =>
        !(acc.accessToken && acc.accessToken.startsWith('mock-')) &&
        !(acc.platformAccountId && acc.platformAccountId.startsWith('mock-'))
      ) || socialAccount[0];
    }

    if (!account) {
      if (optional) return { auth: null, account: null };
      throw new Error('YouTube account not connected');
    }

    if (
      (account.accessToken && account.accessToken.startsWith('mock-')) ||
      (account.platformAccountId && account.platformAccountId.startsWith('mock-'))
    ) {
      if (optional) return { auth: null, account };
      throw new Error('YouTube account is using a mock credentials token');
    }

    const auth = googleOAuthService.createClient();
    auth.setCredentials({ access_token: account.accessToken });
    return { auth, account };
  }

  async _resolveUploadsPlaylistId(auth, account) {
    let uploadsId = account.youtubeChannel?.uploadsPlaylistId;
    if (!uploadsId || uploadsId === 'mock-uploads-playlist-id') {
      const channelRes = await youtubeGateway.getChannelList(auth, true);
      uploadsId = channelRes.data.items[0]?.contentDetails?.relatedPlaylists?.uploads;
    }
    return uploadsId;
  }

  extractVideoId(url) {
    const regex = /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/i;
    const match = url.match(regex);
    return match ? match[1] : null;
  }
}

module.exports = new YouTubeVideoService();
