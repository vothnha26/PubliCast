const youtubeGateway = require('./youtube.gateway');
const googleOAuthService = require('../google-oauth.service');
const socialAccountRepository = require('../../../repositories/social/social-account.repository');
const trackedVideoRepository = require('../../../repositories/social/tracked-video.repository');
const prisma = require('../../../config/prisma');
const redisClient = require('../../../config/redis');
const socketInvalidationService = require('../../core/socket-invalidation.service');
const { CACHE_SCOPES } = require('../../../utils/socket-constants');
const { PLATFORMS, POST_STATUS, SEPARATORS, YOUTUBE_API, YOUTUBE_VIDEO_DETAILS_CACHE } = require('../../../utils/constants');

class YouTubeVideoService {
  async getPublishedVideos(brandId, pageToken = null, limit = 10, socialAccountId = null, forceSync = false, startDate = null, endDate = null) {
    const cacheKey = `cache:youtube:videos:${brandId}:${pageToken || 'first'}:${limit}`;

    // 1. Try Redis Cache (< 2ms response time)
    if (!forceSync && redisClient && redisClient.isOpen) {
      try {
        const cachedData = await redisClient.get(cacheKey);
        if (cachedData) {
          const parsed = JSON.parse(cachedData);
          return { ...parsed, videos: this._filterByDateRange(parsed.videos, startDate, endDate) };
        }
      } catch (err) {
        console.warn('[YouTubeVideoService] Redis get failed:', err.message);
      }
    }

    // 2. Try MySQL DB (prisma.post) (< 20ms response time)
    if (!forceSync) {
      try {
        const dbPosts = await prisma.post.findMany({
          where: {
            brandId,
            targetPlatforms: { contains: PLATFORMS.YOUTUBE },
            status: POST_STATUS.PUBLISHED,
            isDeleted: false
          },
          orderBy: { publishedAt: 'desc' },
          take: parseInt(limit, 10) || 10
        });

        if (dbPosts && dbPosts.length > 0) {
          const videos = dbPosts.map(p => ({
            id: p.platformPostId || p.id,
            title: p.title || 'YouTube Video',
            thumbnailUrl: p.mediaThumbnailUrls || '',
            publishedAt: p.publishedAt ? p.publishedAt.toISOString() : p.createdAt.toISOString(),
            views: '0',
            likes: '0',
            comments: '0',
            status: p.status,
            platform: PLATFORMS.YOUTUBE,
            postUrl: YOUTUBE_API.videoUrl(p.platformPostId || p.id)
          }));

          const responsePayload = { videos, nextPageToken: null, prevPageToken: null, fromDb: true };

          if (redisClient && redisClient.isOpen) {
            redisClient.setEx(cacheKey, 300, JSON.stringify(responsePayload)).catch(() => {});
          }

          // Trigger non-blocking async background live sync from YouTube API
          this._triggerBackgroundLiveSync(brandId, pageToken, limit, socialAccountId).catch(err => {
            console.warn('[YouTubeVideoService] Async background sync error:', err.message);
          });

          return { ...responsePayload, videos: this._filterByDateRange(responsePayload.videos, startDate, endDate) };
        }
      } catch (dbErr) {
        console.warn('[YouTubeVideoService] DB posts lookup failed, falling back to YouTube API:', dbErr.message);
      }
    }

    // 3. Cold Start Fallback / Forced Sync: Live YouTube API call
    const liveResult = await this._fetchAndPersistLiveYouTubeVideos(brandId, pageToken, limit, socialAccountId, cacheKey);
    return { ...liveResult, videos: this._filterByDateRange(liveResult.videos, startDate, endDate) };
  }

  // See FacebookPostService#_filterByDateRange (same repo pattern) — a
  // display-only narrowing on top of whatever page of results was already
  // fetched/cached, never widening it.
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

  async _fetchAndPersistLiveYouTubeVideos(brandId, pageToken, limit, socialAccountId, cacheKey) {
    try {
      const { auth, account } = await this._getAuthContext(brandId, false, socialAccountId);
      const uploadsId = await this._resolveUploadsPlaylistId(auth, account);
      
      const playlistRes = await youtubeGateway.getPlaylistItems(auth, uploadsId, limit, pageToken);
      if (!playlistRes.data.items || playlistRes.data.items.length === 0) {
        return { videos: [], nextPageToken: null, prevPageToken: null };
      }

      const videoIds = playlistRes.data.items.map(item => item.contentDetails.videoId).join(SEPARATORS.COMMA);
      const videoDetails = await youtubeGateway.getVideosList(auth, videoIds);
      const formattedVideos = this._formatVideoList(videoDetails.data.items);

      await this._upsertPublishedVideosToDb(brandId, formattedVideos).catch(err => {
        console.warn('[YouTubeVideoService] Auto-upsert published videos failed:', err.message);
      });

      const responsePayload = {
        videos: formattedVideos,
        nextPageToken: playlistRes.data.nextPageToken,
        prevPageToken: playlistRes.data.prevPageToken
      };

      if (cacheKey && redisClient && redisClient.isOpen) {
        redisClient.setEx(cacheKey, 300, JSON.stringify(responsePayload)).catch(() => {});
      }

      // Broadcast Socket Invalidation event
      socketInvalidationService.invalidateBrandScope(brandId, CACHE_SCOPES.PUBLISHED_VIDEOS).catch(() => {});

      return responsePayload;
    } catch (error) {
      if (error.message.includes('YouTube account not connected')) {
        return { videos: [], nextPageToken: null, prevPageToken: null };
      }
      throw error;
    }
  }

  async _triggerBackgroundLiveSync(brandId, pageToken, limit, socialAccountId) {
    const cacheKey = `cache:youtube:videos:${brandId}:${pageToken || 'first'}:${limit}`;
    return this._fetchAndPersistLiveYouTubeVideos(brandId, pageToken, limit, socialAccountId, cacheKey);
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
    return trackedVideoRepository.upsertTrackedVideo(brandId, videoId, this._prepareTrackedVideoData(video));
  }

  async getTrackedVideos(brandId) {
    return trackedVideoRepository.getTrackedVideos(brandId);
  }

  async getVideoDetails(brandId, videoId) {
    const isYouTubeId = typeof videoId === 'string' && /^[a-zA-Z0-9_-]{11}$/.test(videoId);

    // Read-through cache: view/like/comment counts don't need to be
    // real-time (Inbox preview was hammering the live API on every click,
    // including N times for the same video across its own comments — see
    // #inbox-preview-slow). Reuse whatever the last sync wrote within the
    // last hour instead of calling YouTube again.
    const cached = await trackedVideoRepository.findByBrandAndVideoId(brandId, videoId);
    if (cached && cached.lastSyncedAt && Date.now() - cached.lastSyncedAt.getTime() < YOUTUBE_VIDEO_DETAILS_CACHE.TTL_MS) {
      return this._formatTrackedVideoAsDetails(cached);
    }

    const { auth } = await this._getAuthContext(brandId, true);

    if (!auth) {
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

    try {
      const response = await youtubeGateway.getVideosList(auth, videoId);
      if (!response.data.items || response.data.items.length === 0) {
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

      const video = response.data.items[0];
      const channelRes = await youtubeGateway.getChannelList(auth, false, video.snippet.channelId);

      trackedVideoRepository
        .upsertTrackedVideo(brandId, videoId, this._prepareTrackedVideoData(video))
        .catch(err => console.warn('[YouTubeVideoService] Failed to cache video details:', err.message));

      return this._formatVideoDetails(video, channelRes.data.items?.[0]);
    } catch (err) {
      console.error(`[YouTubeVideoService] getVideoDetails error for video ${videoId}:`, err.message || err);
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
      account = await socialAccountRepository.findById(socialAccountId);
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

  _formatVideoList(items) {
    return (items || [])
      .filter(v => v.status?.privacyStatus !== 'private')
      .map(v => ({
        id: v.id,
        title: v.snippet.title,
        thumbnailUrl: v.snippet.thumbnails.medium?.url || v.snippet.thumbnails.default.url,
        publishedAt: v.snippet.publishedAt,
        views: v.statistics?.viewCount || 0,
        likes: v.statistics?.likeCount || 0,
        comments: v.statistics?.commentCount || 0,
        duration: v.contentDetails?.duration,
        status: POST_STATUS.PUBLISHED,
        privacyStatus: v.status?.privacyStatus || 'public',
        platform: PLATFORMS.YOUTUBE,
        postUrl: YOUTUBE_API.videoUrl(v.id),
        madeForKids: v.status?.madeForKids ?? v.status?.selfDeclaredMadeForKids ?? false
      }));
  }

  _formatVideoDetails(video, channel) {
    return {
      id: video.id,
      title: video.snippet.title,
      description: video.snippet.description,
      thumbnailUrl: video.snippet.thumbnails.high?.url || video.snippet.thumbnails.default.url,
      channelId: video.snippet.channelId,
      channelTitle: video.snippet.channelTitle,
      subscriberCount: channel?.statistics?.subscriberCount,
      viewCount: video.statistics.viewCount,
      likeCount: video.statistics.likeCount,
      publishedAt: video.snippet.publishedAt,
      madeForKids: video.status?.madeForKids ?? video.status?.selfDeclaredMadeForKids ?? false
    };
  }

  _formatTrackedVideoAsDetails(tracked) {
    return {
      id: tracked.videoId,
      title: tracked.title,
      description: undefined,
      thumbnailUrl: tracked.thumbnailUrl,
      channelId: tracked.channelId,
      channelTitle: tracked.channelName,
      subscriberCount: undefined,
      viewCount: tracked.lastViews,
      likeCount: tracked.lastLikes,
      publishedAt: tracked.publishedAt ? tracked.publishedAt.toISOString() : undefined,
      madeForKids: undefined
    };
  }

  _prepareTrackedVideoData(video) {
    return {
      title: video.snippet.title,
      thumbnailUrl: video.snippet.thumbnails.high?.url || video.snippet.thumbnails.default.url,
      lastViews: parseInt(video.statistics.viewCount) || 0,
      lastLikes: parseInt(video.statistics.likeCount) || 0,
      lastComments: parseInt(video.statistics.commentCount) || 0,
      channelId: video.snippet.channelId,
      channelName: video.snippet.channelTitle,
      publishedAt: new Date(video.snippet.publishedAt)
    };
  }

  extractVideoId(url) {
    const regex = /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/i;
    const match = url.match(regex);
    return match ? match[1] : null;
  }

  async _upsertPublishedVideosToDb(brandId, videos) {
    if (!videos || videos.length === 0) return;

    const brand = await prisma.brand.findUnique({
      where: { id: brandId },
      select: { ownerId: true }
    });
    if (!brand || !brand.ownerId) return;

    for (const v of videos) {
      try {
        const existing = await prisma.post.findFirst({
          where: { brandId, platformPostId: v.id }
        });

        if (existing) {
          await prisma.post.update({
            where: { id: existing.id },
            data: {
              title: v.title || existing.title,
              caption: v.description || existing.caption,
              mediaThumbnailUrls: v.thumbnailUrl || existing.mediaThumbnailUrls,
              publishedAt: v.publishedAt ? new Date(v.publishedAt) : existing.publishedAt,
              status: POST_STATUS.PUBLISHED
            }
          });
        } else {
          await prisma.post.create({
            data: {
              brandId,
              createdByUserId: brand.ownerId,
              title: v.title || 'YouTube Video',
              caption: v.description || '',
              type: 'VIDEO',
              status: POST_STATUS.PUBLISHED,
              targetPlatforms: 'YOUTUBE',
              platformPostId: v.id,
              mediaThumbnailUrls: v.thumbnailUrl || '',
              publishedAt: v.publishedAt ? new Date(v.publishedAt) : new Date(),
              scheduledAt: v.publishedAt ? new Date(v.publishedAt) : null
            }
          });
        }
      } catch (err) {
        console.warn(`[YouTubeVideoService] Failed to upsert video ${v.id} into post DB:`, err.message);
      }
    }
  }
}

module.exports = new YouTubeVideoService();
