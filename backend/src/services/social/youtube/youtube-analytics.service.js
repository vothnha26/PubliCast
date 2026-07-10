const youtubeGateway = require('./youtube.gateway');
const googleOAuthService = require('../google-oauth.service');
const socialAccountRepository = require('../../../repositories/social/social-account.repository');
const competitorRepository = require('../../../repositories/social/competitor.repository');
const MockConnectionGuard = require('../mock-connection.guard');
const { PLATFORMS, SEPARATORS, ANALYTICS, SOCIAL_TECHNICAL } = require('../../../utils/constants');

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
      if (tokens.refresh_token) {
        await socialAccountRepository.updateTokens(account.id, tokens);
      } else if (tokens.access_token) {
        await socialAccountRepository.updateTokens(account.id, {
          ...tokens,
          refresh_token: account.refreshToken
        });
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

  _getMockAnalyticsReport(startDate, endDate) {
    const { start, end } = this._resolveDates(startDate, endDate);
    const startMs = new Date(start + 'T00:00:00Z').getTime();
    const endMs = new Date(end + 'T00:00:00Z').getTime();
    const dailyMap = {};
    
    let totalViews = 0;
    for (let t = startMs; t <= endMs; t += 24 * 60 * 60 * 1000) {
      const d = new Date(t).toISOString().split('T')[0];
      const dailyViews = Math.round(500 + Math.random() * 800);
      totalViews += dailyViews;
      dailyMap[d] = {
        date: d,
        views: dailyViews,
        subscribersGained: Math.round(15 + Math.random() * 25),
        subscribersLost: Math.round(1 + Math.random() * 3),
        totalContent: Math.random() > 0.85 ? 1 : 0
      };
    }
    const growth = Object.keys(dailyMap).sort().map(d => dailyMap[d]);

    return {
      demographics: [
        ['18-24', 'female', 12.5],
        ['18-24', 'male', 28.3],
        ['25-34', 'female', 18.2],
        ['25-34', 'male', 41.0]
      ],
      trafficSource: [
        ['YouTube search', Math.round(totalViews * 0.45), Math.round(totalViews * 0.45 * 8)],
        ['Suggested videos', Math.round(totalViews * 0.30), Math.round(totalViews * 0.30 * 9)],
        ['Direct or unknown', Math.round(totalViews * 0.15), Math.round(totalViews * 0.15 * 5)],
        ['Browse features', Math.round(totalViews * 0.10), Math.round(totalViews * 0.10 * 7)]
      ],
      geographic: [
        ['VN', Math.round(totalViews * 0.70)],
        ['US', Math.round(totalViews * 0.15)],
        ['JP', Math.round(totalViews * 0.08)],
        ['SG', Math.round(totalViews * 0.07)]
      ],
      growth
    };
  }

  _getMockGrowthData() {
    return [];
  }

  async getChannelInfo(auth, startDate, endDate, account = null) {
    const accessToken = auth?.credentials?.access_token;
    if (accessToken && MockConnectionGuard.isMock(accessToken, account?.platformAccountId)) {
      if (account?.youtubeChannel) {
        const analyticsData = await this.getAnalyticsReport(auth, startDate, endDate);
        return {
          channelId: account.platformAccountId,
          username: account.username,
          displayName: account.displayName,
          profilePictureUrl: account.profilePictureUrl,
          statistics: {
            viewCount: account.youtubeChannel.totalViewsCount?.toString() || '0',
            subscriberCount: account.youtubeChannel.subscribersCount?.toString() || '0',
            videoCount: account.youtubeChannel.totalVideosCount?.toString() || '0',
            hiddenSubscriberCount: false
          },
          snippet: {
            title: account.displayName,
            description: 'YouTube Channel (Mock)',
            customUrl: account.username,
            publishedAt: account.connectedAt?.toISOString() || new Date().toISOString(),
            thumbnails: {
              default: { url: account.profilePictureUrl }
            }
          },
          analytics: analyticsData,
          uploadsPlaylistId: account.youtubeChannel.uploadsPlaylistId || 'mock-uploads-playlist-id'
        };
      }
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
      console.warn(`[YouTube Analytics] API call failed or timed out (${error.message}). Falling back to empty data...`);
      return this._getEmptyChannelInfo(account);
    }
  }

  async getAnalyticsReport(auth, startDate, endDate) {
    const accessToken = auth?.credentials?.access_token;
    if (accessToken && MockConnectionGuard.isMock(accessToken)) {
      return this._getMockAnalyticsReport(startDate, endDate);
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
      metrics: `${ANALYTICS.METRICS.YOUTUBE.VIEWS},${ANALYTICS.METRICS.YOUTUBE.SUBSCRIBERS_GAINED},${ANALYTICS.METRICS.YOUTUBE.SUBSCRIBERS_LOST}`,
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
        subscribersGained: 0,
        subscribersLost: 0,
        totalContent: videosPerDay[d] || 0
      };
    }

    rows.forEach(row => {
      const d = row[0];
      if (dailyMap[d]) {
        dailyMap[d].views = row[1];
        dailyMap[d].subscribersGained = row[2];
        dailyMap[d].subscribersLost = row[3];
      }
    });

    return Object.keys(dailyMap).sort().map(d => dailyMap[d]);
  }

  async connectChannel(brandId, code, redirectUri) {
    const tokens = await googleOAuthService.getTokens(code, redirectUri);
    const client = googleOAuthService.createClient(redirectUri);
    client.setCredentials(tokens);
    
    const channelData = await this.getChannelInfo(client);
    
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

    if (account.accessToken && MockConnectionGuard.isMock(account.accessToken, account.platformAccountId)) {
      console.log(`[YouTube Analytics] Mock token detected: ${account.accessToken}. Skipping Google API sync.`);
      return account;
    }

    const client = this._createAuthenticatedClient(account);

    const channelData = await this.getChannelInfo(client, startDate, endDate, account);
    
    return socialAccountRepository.upsertYouTubeAccount(account.brandId, channelData, {
      access_token: client.credentials.access_token,
      refresh_token: client.credentials.refresh_token,
      expiry_date: client.credentials.expiry_date
    });
  }

  async addCompetitor(brandId, channelId) {
    const socialAccount = await socialAccountRepository.findByBrandAndPlatform(brandId, PLATFORMS.YOUTUBE);
    if (!socialAccount || socialAccount.length === 0) throw new Error('YouTube account not connected');

    const activeAccount = socialAccount.find(acc => 
      !MockConnectionGuard.isMock(acc.accessToken, acc.platformAccountId)
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
      !MockConnectionGuard.isMock(acc.accessToken, acc.platformAccountId)
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
    try {
      const socialAccount = await socialAccountRepository.findByBrandAndPlatform(brandId, PLATFORMS.YOUTUBE);
      if (!socialAccount || socialAccount.length === 0) {
        return this._getMockVideoAnalytics(start, end);
      }

      const activeAccount = socialAccount.find(acc => 
        !MockConnectionGuard.isMock(acc.accessToken, acc.platformAccountId)
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
      return this._getMockVideoAnalytics(start, end);
    }
  }

  _getMockVideoAnalytics(start, end) {
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
        avgWatchTime: 0
      });
    }
    return rows;
  }

  async deleteCompetitor(id) {
    return competitorRepository.deleteCompetitor(id);
  }
}

module.exports = new YouTubeAnalyticsService();
