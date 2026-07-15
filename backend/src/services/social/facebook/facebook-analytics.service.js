const facebookGateway = require('./facebook.gateway');
const socialAccountRepository = require('../../../repositories/social/social-account.repository');
const { PLATFORMS, DEFAULT_CONFIG, ANALYTICS, SOCIAL_TECHNICAL } = require('../../../utils/constants');

class FacebookAnalyticsService {
  _getEmptyChannelInfo(pageId, account = null) {
    return {
      pageId: pageId || account?.platformAccountId || 'fb-page-mock',
      username: account?.username || 'facebook_page',
      displayName: account?.displayName || 'Facebook Page',
      profilePictureUrl: account?.profilePictureUrl || 'https://images.unsplash.com/photo-1614680376593-902f74fa0d41?w=150&auto=format&fit=crop&q=60',
      category: 'Social Page',
      likesCount: 0,
      followersCount: 0,
      about: 'No data available',
      website: ''
    };
  }

  _getMockAnalyticsReport(startDate, endDate, currentFollowersCount) {
    const { start, end } = this._resolveDates(startDate, endDate);
    const dailyMap = this._initializeDailyMap(start, end);
    
    Object.keys(dailyMap).forEach((dateStr) => {
      dailyMap[dateStr].views = 0;
      dailyMap[dateStr].pageVisits = 0;
      dailyMap[dateStr].totalClicks = 0;
      dailyMap[dateStr].acquired = 0;
      dailyMap[dateStr].lost = 0;
    });

    const feedStats = {
      totalPostsInPeriod: 0,
      totalReactions: 0,
      totalComments: 0,
      totalShares: 0,
      albumCount: 0,
      imageCount: 0
    };

    const sortedDates = Object.keys(dailyMap).sort().map(d => dailyMap[d]);
    return this._calculateTotalsAndFormatResponse(sortedDates, currentFollowersCount || 0, feedStats, []);
  }

  async getChannelInfo(auth, startDate, endDate, socialAccountId = null) {
    let account = null;
    if (socialAccountId) {
      account = await socialAccountRepository.findById(socialAccountId);
    }

    if (auth.pageAccessToken && auth.pageAccessToken.startsWith('mock-')) {
      const pageData = this._getEmptyChannelInfo(auth.pageId, account);
      const analyticsData = this._getMockAnalyticsReport(startDate, endDate, pageData.followersCount);
      return {
        ...pageData,
        analytics: analyticsData
      };
    }

    const fetchRealData = async () => {
      const pageData = await facebookGateway.getPageDetails(auth.pageId, auth.pageAccessToken);
      const followersToUse = pageData.followersCount > 0 ? pageData.followersCount : pageData.likesCount;
      const analyticsData = await this.getAnalyticsReport(auth.pageId, auth.pageAccessToken, startDate, endDate, followersToUse, socialAccountId);
      
      return {
        ...pageData,
        analytics: analyticsData
      };
    };

    // Helper: Wrap promise with a timeout rejection
    const withTimeout = (promise, ms = 60000) => {
      let timeoutId;
      const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error('Facebook API request timeout (60000ms) exceeded'));
        }, ms);
      });
      return Promise.race([promise, timeoutPromise]).finally(() => {
        clearTimeout(timeoutId);
      });
    };

    try {
      return await withTimeout(fetchRealData(), 60000);
    } catch (error) {
      console.warn(`[Facebook Analytics] Real API call failed or timed out (${error.message}). Falling back to empty data...`);
      const pageData = this._getEmptyChannelInfo(auth.pageId, account);
      const analyticsData = this._getMockAnalyticsReport(startDate, endDate, pageData.followersCount);
      return {
        ...pageData,
        analytics: analyticsData
      };
    }
  }

  async getAnalyticsReport(pageId, pageAccessToken, startDate, endDate, currentFollowersCount, socialAccountId = null) {
    if (pageAccessToken && pageAccessToken.startsWith('mock-')) {
      return this._getMockAnalyticsReport(startDate, endDate, currentFollowersCount);
    }

    try {
      const { start, end } = this._resolveDates(startDate, endDate);
      const dailyMap = this._initializeDailyMap(start, end);

      // --- SMART SYNC LOGIC ---
      let missingRanges = [{ start, end }];

      if (socialAccountId) {
        const existingAnalytics = await socialAccountRepository.findAnalyticsInRange(socialAccountId, start, end);
        
        // existingAnalytics is ordered by fetchedAt DESC (newest first)
        existingAnalytics.forEach(record => {
          if (record.socialAnalytics?.audienceDemographicsJson) {
            try {
              const data = JSON.parse(record.socialAnalytics.audienceDemographicsJson);
              const growth = data.growth || [];
              growth.forEach(day => {
                // Only fill from DB if this date hasn't been filled by a newer record
                if (dailyMap[day.date] && !dailyMap[day.date]._fromDb) {
                  Object.assign(dailyMap[day.date], day);
                  // Mark as from DB if it contains real-looking data
                  // We use a small threshold to avoid marking 'empty' DB records as authoritative
                  if (day.views > 0 || day.pageVisits > 0 || day.acquired > 0 || day.totalClicks > 0) {
                    dailyMap[day.date]._fromDb = true;
                  }
                }
              });
            } catch (e) {
              console.error('[Facebook Analytics] Failed to parse DB JSON:', e);
            }
          }
        });

        // Calculate missing contiguous ranges
        missingRanges = this._calculateMissingRanges(dailyMap, start, end);
      }

      console.log(`[Facebook Analytics] Smart Sync: Requesting ${missingRanges.length} missing ranges from API for ${pageId}`);

      let hasInsightsData = false;
      for (const range of missingRanges) {
        const insights = await facebookGateway.getPageInsights(pageId, pageAccessToken, range.start, range.end);
        if (this._processInsights(insights, dailyMap)) {
          hasInsightsData = true;
        }
      }

      // Always fetch feed for the full period to ensure post counts are accurate
      const feedResult = await facebookGateway.getPageFeed(pageId, pageAccessToken, null, 100);
      const feedStats = this._processFeed(feedResult.data || [], dailyMap);

      if (!hasInsightsData && !Object.values(dailyMap).some(d => d._fromDb)) {
        if (pageAccessToken.startsWith('mock-')) {
          this._generateMockFallback(dailyMap);
        }
      }

      // Fetch Page Stories
      let stories = [];
      if (pageAccessToken.startsWith('mock-')) {
        stories = this._generateMockStories();
      } else {
      try {
        const rawStories = await facebookGateway.getPageStories(pageId, pageAccessToken);
        for (const story of rawStories) {
          const insights = await facebookGateway.getStoryInsights(story.id, pageAccessToken);
          const mappedInsights = {};
          insights.forEach(item => {
            mappedInsights[item.name] = item.values?.[0]?.value || 0;
          });

          // Completion rate logic: (reach - exits) / reach
          const reach = mappedInsights.reach || 0;
          const exits = mappedInsights.exits || 0;
          const completionRate = reach ? parseFloat(((reach - exits) / reach).toFixed(4)) : 0;
          const exitRate = mappedInsights.impressions ? parseFloat((exits / mappedInsights.impressions).toFixed(4)) : 0;

          let publishedAt = new Date();
          if (story.creation_time) {
            const num = Number(story.creation_time);
            if (!isNaN(num)) {
              const isSeconds = num < 9999999999;
              publishedAt = new Date(isSeconds ? num * 1000 : num);
            } else {
              const parsed = Date.parse(story.creation_time);
              if (!isNaN(parsed)) {
                publishedAt = new Date(parsed);
              }
            }
          }
          const expiresAt = new Date(publishedAt.getTime() + 24 * 60 * 60 * 1000);

          stories.push({
            platformStoryId: story.id,
            publishedAt: publishedAt.toISOString(),
            expiresAt: expiresAt.toISOString(),
            mediaType: story.media_type || 'IMAGE',
            mediaUrl: story.media_url || null,
            thumbnailUrl: story.media_url || null,
            reach: reach,
            impressions: mappedInsights.impressions || 0,
            exits: exits,
            replies: mappedInsights.replies || 0,
            linkClicks: mappedInsights.link_clicks || 0,
            completionRate: completionRate,
            exitRate: exitRate
          });
        }
      } catch (err) {
        console.error('[Facebook Stories] Failed to fetch real stories:', err.message);
      }
      }

      const sortedDates = Object.keys(dailyMap).sort().map(d => {
        const { _fromDb, ...cleanData } = dailyMap[d];
        return cleanData;
      });
      
      // Remove trailing days with no data (due to FB API delay)
      const finalData = [...sortedDates];
      while (finalData.length > 2) {
        const lastDay = finalData[finalData.length - 1];
        if (lastDay.views === 0 && lastDay.pageVisits === 0 && lastDay.acquired === 0 && lastDay.totalClicks === 0) {
          finalData.pop();
        } else {
          break;
        }
      }

      return this._calculateTotalsAndFormatResponse(finalData.length > 0 ? finalData : sortedDates, currentFollowersCount, feedStats, stories);
    } catch (error) {
      console.error('Error fetching Facebook Page Analytics:', error);
      throw error;
    }
  }

  _calculateMissingRanges(dailyMap, start, end) {
    const sortedDates = Object.keys(dailyMap).sort();
    const ranges = [];
    let currentRange = null;

    sortedDates.forEach(dateStr => {
      if (!dailyMap[dateStr]._fromDb) {
        if (!currentRange) {
          currentRange = { start: dateStr, end: dateStr };
        } else {
          currentRange.end = dateStr;
        }
      } else {
        if (currentRange) {
          ranges.push(currentRange);
          currentRange = null;
        }
      }
    });

    if (currentRange) {
      ranges.push(currentRange);
    }

    return ranges;
  }

  _resolveDates(startDate, endDate) {
    const now = new Date();
    const defaultStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const defaultEnd = now.toISOString().split('T')[0];
    
    let start = startDate || defaultStart;
    let end = endDate || defaultEnd;

    if (start === end) {
      const prevDate = new Date(new Date(start).getTime() - 24 * 60 * 60 * 1000);
      start = prevDate.toISOString().split('T')[0];
    }

    const startMs = new Date(start).getTime();
    const endMs = new Date(end).getTime();
    const diffDays = (endMs - startMs) / (24 * 60 * 60 * 1000);

    if (diffDays > 180) {
      const adjustedStart = new Date(endMs - 180 * 24 * 60 * 60 * 1000);
      start = adjustedStart.toISOString().split('T')[0];
    }

    return { start, end };
  }

  _initializeDailyMap(start, end) {
    const dailyMap = {};
    const startMs = new Date(start + 'T00:00:00Z').getTime();
    const endMs = new Date(end + 'T00:00:00Z').getTime();
    const oneDayMs = 24 * 60 * 60 * 1000;
    
    for (let time = startMs; time <= endMs; time += oneDayMs) {
      const dateStr = new Date(time).toISOString().split('T')[0];
      dailyMap[dateStr] = {
        date: dateStr,
        name: new Date(time).toLocaleDateString(DEFAULT_CONFIG.LOCALE, { month: 'short', day: 'numeric', timeZone: 'UTC' }),
        followers: 0,
        views: 0,
        pageVisits: 0,
        totalContent: 0,
        acquired: 0,
        lost: 0,
        totalClicks: 0,
        engagements: 0,
        reactions: 0,
        comments: 0,
        shares: 0
      };
    }
    return dailyMap;
  }

  _processInsights(insights, dailyMap) {
    let hasInsightsData = false;
    for (const item of insights) {
      const name = item.name;
      if (item.values) {
        for (const val of item.values) {
          const d = new Date(val.end_time);
          d.setTime(d.getTime() - 24 * 60 * 60 * 1000);
          const dateStr = d.toISOString().split('T')[0];
          
          if (dailyMap[dateStr]) {
            if (val.value > 0) hasInsightsData = true;
            if (name === 'page_views_total') {
              dailyMap[dateStr].pageVisits = val.value || 0;
            } else if (name === ANALYTICS.METRICS.FACEBOOK.VIEWS || name === 'page_media_view') {
              dailyMap[dateStr].views = val.value || 0;
            } else if (name === ANALYTICS.METRICS.FACEBOOK.IMPRESSIONS || name === 'page_total_media_view_unique') {
              if (!dailyMap[dateStr].views) {
                dailyMap[dateStr].views = val.value || 0;
              }
            } else if (name === ANALYTICS.METRICS.FACEBOOK.FOLLOWS || name === 'page_fan_adds_unique') {
              dailyMap[dateStr].acquired = (dailyMap[dateStr].acquired || 0) + (val.value || 0);
            } else if (name === 'page_daily_unfollows_unique' || name === 'page_fan_removes_unique') {
              dailyMap[dateStr].lost = (dailyMap[dateStr].lost || 0) + (val.value || 0);
            } else if (name === ANALYTICS.METRICS.FACEBOOK.ACTIONS) {
              dailyMap[dateStr].totalClicks = val.value || 0;
            } else if (name === ANALYTICS.METRICS.FACEBOOK.ENGAGEMENTS) {
              dailyMap[dateStr].engagements = val.value || 0;
              if (!dailyMap[dateStr].totalClicks) dailyMap[dateStr].totalClicks = val.value || 0;
            }
          }
        }
      }
    }
    return hasInsightsData;
  }

  _processFeed(feed, dailyMap) {
    const stats = {
      totalPostsInPeriod: 0,
      totalReactions: 0,
      totalComments: 0,
      totalShares: 0,
      albumCount: 0,
      imageCount: 0
    };

    for (const post of feed) {
      const postDateStr = new Date(post.created_time).toISOString().split('T')[0];
      if (dailyMap[postDateStr]) {
        dailyMap[postDateStr].totalContent += 1;
        stats.totalPostsInPeriod++;

        const commentCount = post.comments?.summary?.total_count || post.comments?.data?.length || 0;
        const reactionCount = post.reactions?.summary?.total_count || post.reactions?.data?.length || 0;
        const shareCount = post.shares?.count || 0;

        dailyMap[postDateStr].reactions += reactionCount;
        dailyMap[postDateStr].comments += commentCount;
        dailyMap[postDateStr].shares += shareCount;

        stats.totalReactions += reactionCount;
        stats.totalComments += commentCount;
        stats.totalShares += shareCount;

        const attachments = post.attachments?.data || [];
        const type = attachments[0]?.type || SOCIAL_TECHNICAL.FB_ATTACHMENT.STATUS;
        if (type === SOCIAL_TECHNICAL.FB_ATTACHMENT.ALBUM) stats.albumCount++;
        else stats.imageCount++;
      }
    }
    return stats;
  }

  _generateMockStories() {
    const now = Date.now();
    return [1, 2].map((n) => {
      const publishedAt = new Date(now - n * 4 * 60 * 60 * 1000);
      const expiresAt = new Date(publishedAt.getTime() + 24 * 60 * 60 * 1000);
      const reach = 800 * n;
      const exits = 60 * n;
      const impressions = 1000 * n;
      return {
        platformStoryId: `mock-story-${n}`,
        publishedAt: publishedAt.toISOString(),
        expiresAt: expiresAt.toISOString(),
        mediaType: 'IMAGE',
        mediaUrl: null,
        thumbnailUrl: null,
        reach,
        impressions,
        exits,
        replies: 5 * n,
        linkClicks: 3 * n,
        completionRate: parseFloat(((reach - exits) / reach).toFixed(4)),
        exitRate: parseFloat((exits / impressions).toFixed(4))
      };
    });
  }

  _generateMockFallback(dailyMap) {
    Object.keys(dailyMap).forEach((dateStr) => {
      const dayData = dailyMap[dateStr];
      dayData.views = 0;
      dayData.pageVisits = 0;
      dayData.totalClicks = 0;
      dayData.acquired = 0;
      dayData.lost = 0;
    });
  }

  _calculateTotalsAndFormatResponse(sortedDates, currentFollowersCount, feedStats, stories = []) {
    let tempFollowers = currentFollowersCount;
    for (let i = sortedDates.length - 1; i >= 0; i--) {
      sortedDates[i].followers = tempFollowers;
      tempFollowers = Math.max(0, tempFollowers - (sortedDates[i].acquired || 0) + (sortedDates[i].lost || 0));
    }

    const totalViews = sortedDates.reduce((sum, d) => sum + d.views, 0);
    const totalPageVisits = sortedDates.reduce((sum, d) => sum + d.pageVisits, 0);
    const totalClicks = sortedDates.reduce((sum, d) => sum + d.totalClicks, 0);
    const totalAcquired = sortedDates.reduce((sum, d) => sum + d.acquired, 0);
    const totalLost = sortedDates.reduce((sum, d) => sum + d.lost, 0);

    const daysCount = sortedDates.length || 1;
    const averageDailyNewFollowers = Math.round((totalAcquired - totalLost) / daysCount);
    const dailyPageViews = parseFloat((totalPageVisits / daysCount).toFixed(2));
    const dailyPosts = parseFloat((feedStats.totalPostsInPeriod / daysCount).toFixed(2));
    const postsPerWeek = parseFloat((dailyPosts * 7).toFixed(2));

    const dailyReactions = parseFloat((feedStats.totalReactions / daysCount).toFixed(2));
    const reactionsPerPost = feedStats.totalPostsInPeriod ? parseFloat((feedStats.totalReactions / feedStats.totalPostsInPeriod).toFixed(2)) : 0;
    const dailyComments = parseFloat((feedStats.totalComments / daysCount).toFixed(2));
    const commentsPerPost = feedStats.totalPostsInPeriod ? parseFloat((feedStats.totalComments / feedStats.totalPostsInPeriod).toFixed(2)) : 0;
    const sharesPerDay = parseFloat((feedStats.totalShares / daysCount).toFixed(2));
    const sharesPerPost = feedStats.totalPostsInPeriod ? parseFloat((feedStats.totalShares / feedStats.totalPostsInPeriod).toFixed(2)) : 0;

    const totalTypes = feedStats.albumCount + feedStats.imageCount || 1;
    const typesBreakdown = {
      album: Math.round((feedStats.albumCount / totalTypes) * 100),
      image: Math.round((feedStats.imageCount / totalTypes) * 100)
    };

    return {
      startDate: sortedDates[0]?.date,
      endDate: sortedDates[sortedDates.length - 1]?.date,
      stories: stories,
      summary: {
        followers: currentFollowersCount,
        views: totalViews,
        pageVisits: totalPageVisits,
        totalContent: feedStats.totalPostsInPeriod,
        averageDailyNewFollowers,
        dailyPageViews,
        dailyPosts,
        postsPerWeek
      },
      growth: sortedDates.map(d => ({
        date: d.date,
        name: d.name,
        followers: d.followers,
        views: d.views,
        pageVisits: d.pageVisits,
        totalContent: d.totalContent,
        reactions: d.reactions,
        comments: d.comments,
        shares: d.shares
      })),
      balance: sortedDates.map(d => ({
        date: d.date,
        name: d.name,
        acquired: d.acquired,
        lost: d.lost,
        totalContent: d.totalContent
      })),
      clicks: sortedDates.map(d => ({
        date: d.date,
        name: d.name,
        totalClicks: d.totalClicks,
        pageVisits: d.pageVisits,
        totalContent: d.totalContent
      })),
      postsPeriod: sortedDates.map(d => ({
        date: d.date,
        name: d.name,
        views: d.views,
        reactions: d.reactions
      })),
      interactions: {
        reactions: feedStats.totalReactions,
        comments: feedStats.totalComments,
        shares: feedStats.totalShares,
        clicks: totalClicks,
        posts: feedStats.totalPostsInPeriod,
        dailyReactions,
        reactionsPerPost,
        dailyComments,
        commentsPerPost,
        sharesPerDay,
        sharesPerPost,
        typesBreakdown,
        viewsBreakdown: {
          organic: 70, 
          promoted: 30
        }
      }
    };
  }

  async connectChannel(brandId, code, redirectUri) {
    const tokens = await facebookGateway.exchangeCodeForToken(code, redirectUri);
    
    // Diagnostics
    const permissions = await facebookGateway.getUserPermissions(tokens.access_token).catch(() => []);
    const pages = await facebookGateway.getUserPages(tokens.access_token);

    console.log('[Facebook Connect Diagnostics]', {
      permissions,
      pagesCount: pages.length,
      pages: pages.map(p => ({ id: p.id, name: p.name }))
    });

    if (pages.length === 0) {
      const scopes = permissions.map(p => `${p.permission}:${p.status}`).join(', ');
      throw new Error(`Không tìm thấy Trang Facebook. Quyền đã cấp: [${scopes || 'none'}]. Hãy đảm bảo tài khoản FB của bạn có quyền Quản trị (Admin) trên Trang.`);
    }

    const selectedPage = pages[0];
    const pageAccessToken = selectedPage.access_token;
    const pageId = selectedPage.id;

    const pageInfo = await this.getChannelInfo({ pageId, pageAccessToken });
    
    const { ConnectionConflictGuard, ConnectionConflictError } = require('../connection-conflict.guard');
    const conflictResult = await ConnectionConflictGuard.validateConflict(brandId, PLATFORMS.FACEBOOK, pageId);
    
    if (conflictResult.conflict) {
      throw new ConnectionConflictError(
        conflictResult.type,
        selectedPage.name,
        pageId,
        PLATFORMS.FACEBOOK,
        conflictResult.existingAccount.brand.name
      );
    }
    
    return socialAccountRepository.upsertFacebookAccount(brandId, {
      pageId,
      username: selectedPage.name,
      displayName: selectedPage.name,
      profilePictureUrl: pageInfo.profilePictureUrl,
      category: pageInfo.category,
      likesCount: pageInfo.likesCount,
      followersCount: pageInfo.followersCount,
      about: pageInfo.about,
      website: pageInfo.website,
      analytics: pageInfo.analytics
    }, {
      access_token: pageAccessToken,
      refresh_token: tokens.access_token
    });
  }

  async syncChannelMetrics(socialAccountId, startDate, endDate, force = false) {
    const account = await socialAccountRepository.findById(socialAccountId);
    if (!account || account.platform !== PLATFORMS.FACEBOOK) {
      throw new Error('Social account not found or is not a Facebook account');
    }

    const pageId = account.platformAccountId;
    const pageAccessToken = account.accessToken;

    const pageInfo = await this.getChannelInfo({ pageId, pageAccessToken }, startDate, endDate, socialAccountId);

    // enqueueSync: false — đây CHÍNH LÀ sync job đang chạy; xem ghi chú tương tự ở
    // youtube-analytics.service.js syncChannelMetrics.
    return socialAccountRepository.upsertFacebookAccount(account.brandId, {
      pageId,
      username: account.username,
      displayName: account.displayName,
      profilePictureUrl: pageInfo.profilePictureUrl,
      category: pageInfo.category,
      likesCount: pageInfo.likesCount,
      followersCount: pageInfo.followersCount,
      about: pageInfo.about,
      website: pageInfo.website,
      analytics: pageInfo.analytics
    }, {
      access_token: pageAccessToken,
      refresh_token: account.refreshToken
    }, { enqueueSync: false });
  }
}

module.exports = new FacebookAnalyticsService();
