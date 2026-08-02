const youtubeGateway = require('./youtube.gateway');
const googleOAuthService = require('../google-oauth.service');
const socialAccountRepository = require('../../../repositories/social/social-account.repository');
const trackedVideoRepository = require('../../../repositories/social/tracked-video.repository');
const prisma = require('../../../config/prisma');
const { PLATFORMS, POST_STATUS, SEPARATORS, YOUTUBE_API } = require('../../../utils/constants');

class YouTubeVideoService {
  async getPublishedVideos(brandId, pageToken = null, limit = 10, socialAccountId = null) {
    try {
      const { auth, account } = await this._getAuthContext(brandId, false, socialAccountId);
      
      if (account && (
        (account.accessToken && account.accessToken.startsWith('mock-')) ||
        (account.platformAccountId && account.platformAccountId.startsWith('mock-'))
      )) {
        return {
          videos: [
            {
              id: "dQw4w9WgXcQ",
              title: "Rick Astley - Never Gonna Give You Up (Official Music Video)",
              thumbnailUrl: "https://img.youtube.com/vi/dQw4w9WgXcQ/0.jpg",
              publishedAt: "1987-07-27T00:00:00Z",
              views: "1400000000",
              likes: "16000000",
              comments: "3000000",
              duration: "PT3M33S",
              status: POST_STATUS.PUBLISHED
            }
          ],
          nextPageToken: null,
          prevPageToken: null
        };
      }
      const uploadsId = await this._resolveUploadsPlaylistId(auth, account);
      
      const playlistRes = await youtubeGateway.getPlaylistItems(auth, uploadsId, limit, pageToken);
      if (!playlistRes.data.items || playlistRes.data.items.length === 0) {
        return { videos: [], nextPageToken: null, prevPageToken: null };
      }

      const videoIds = playlistRes.data.items.map(item => item.contentDetails.videoId).join(SEPARATORS.COMMA);
      const videoDetails = await youtubeGateway.getVideosList(auth, videoIds);

      return {
        videos: this._formatVideoList(videoDetails.data.items),
        nextPageToken: playlistRes.data.nextPageToken,
        prevPageToken: playlistRes.data.prevPageToken
      };
    } catch (error) {
      if (error.message.includes('YouTube account not connected')) {
        return { videos: [], nextPageToken: null, prevPageToken: null };
      }
      throw error;
    }
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
    const { auth } = await this._getAuthContext(brandId, true);
    const isYouTubeId = typeof videoId === 'string' && /^[a-zA-Z0-9_-]{11}$/.test(videoId);

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

  async getPlaylists(brandId, forceRefresh = false) {
    if (!forceRefresh) {
      const cached = await prisma.youTubePlaylistCache.findMany({ where: { brandId } });
      if (cached.length > 0) return this._formatPlaylistRows(cached);
    }

    const { auth } = await this._getAuthContext(brandId);
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

    await this._upsertPlaylistCache(brandId, playlists);
    return playlists;
  }

  async _upsertPlaylistCache(brandId, playlists) {
    await prisma.$transaction([
      prisma.youTubePlaylistCache.deleteMany({ where: { brandId } }),
      prisma.youTubePlaylistCache.createMany({
        data: playlists.map(p => ({
          brandId,
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

  async getVideoCategories(brandId, forceRefresh = false) {
    const { auth, account } = await this._getAuthContext(brandId);
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
    return items.map(v => ({
      id: v.id,
      title: v.snippet.title,
      thumbnailUrl: v.snippet.thumbnails.medium?.url || v.snippet.thumbnails.default.url,
      publishedAt: v.snippet.publishedAt,
      views: v.statistics.viewCount,
      likes: v.statistics.likeCount,
      comments: v.statistics.commentCount,
      duration: v.contentDetails.duration,
      status: POST_STATUS.PUBLISHED,
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
}

module.exports = new YouTubeVideoService();
