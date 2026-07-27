const instagramGateway = require('./instagram.gateway');
const socialAccountRepository = require('../../../repositories/social/social-account.repository');
const { PLATFORMS, DEFAULT_CONFIG, ANALYTICS, SOCIAL_TECHNICAL } = require('../../../utils/constants');

class InstagramAnalyticsService {
  _getEmptyChannelInfo(igAccountId, account = null) {
    return {
      igAccountId: igAccountId || account?.platformAccountId || 'ig-account-mock',
      username: account?.username || 'instagram_user',
      displayName: account?.displayName || 'Instagram Account',
      profilePictureUrl: account?.profilePictureUrl || '',
      followersCount: 0,
      followingCount: 0,
      mediaCount: 0,
      biography: 'No data available',
      website: ''
    };
  }

  _getMockAnalyticsReport(startDate, endDate, currentFollowersCount, isMock = false) {
    const { start, end } = this._resolveDates(startDate, endDate);
    const dailyMap = this._initializeDailyMap(start, end);
    
    Object.keys(dailyMap).forEach((dateStr) => {
      dailyMap[dateStr].views = 0;
      dailyMap[dateStr].pageVisits = 0;
      dailyMap[dateStr].totalClicks = 0;
      dailyMap[dateStr].acquired = 0;
      dailyMap[dateStr].lost = 0;
      dailyMap[dateStr].totalContent = 0;
    });

    const sortedDates = Object.keys(dailyMap).sort().map(d => dailyMap[d]);
    const feedStats = {
      totalPostsInPeriod: 0,
      totalReactions: 0,
      totalComments: 0,
      totalShares: 0,
      albumCount: 0,
      imageCount: 0
    };

    return this._calculateTotalsAndFormatResponse(sortedDates, currentFollowersCount || 0, feedStats);
  }

  async getChannelInfo(auth, startDate, endDate, socialAccountId = null) {
    let account = null;
    if (socialAccountId) {
      account = await socialAccountRepository.findById(socialAccountId);
    }

    if (auth.pageAccessToken && auth.pageAccessToken.startsWith('mock-')) {
      const igData = this._getEmptyChannelInfo(auth.pageId, account);
      const analyticsData = this._getMockAnalyticsReport(startDate, endDate, igData.followersCount, true);
      return {
        ...igData,
        analytics: analyticsData
      };
    }

    const fetchRealData = async () => {
      const igData = await instagramGateway.getInstagramAccountForPage(auth.pageId, auth.pageAccessToken);
      if (!igData) {
        throw new Error('No Instagram account is linked to this Facebook page.');
      }
      
      const analyticsData = await this.getAnalyticsReport(igData.igAccountId, auth.pageAccessToken, startDate, endDate, igData.followersCount, socialAccountId);
      
      return {
        ...igData,
        analytics: analyticsData
      };
    };

    // Helper: Wrap promise with a timeout rejection
    const withTimeout = (promise, ms = 60000) => {
      let timeoutId;
      const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error('Instagram API request timeout (60000ms) exceeded'));
        }, ms);
      });
      return Promise.race([promise, timeoutPromise]).finally(() => {
        clearTimeout(timeoutId);
      });
    };

    try {
      return await withTimeout(fetchRealData(), 60000);
    } catch (error) {
      console.warn(`[Instagram Analytics] Real API call failed or timed out (${error.message}). Falling back to empty data...`);
      const igData = this._getEmptyChannelInfo(auth.pageId, account);
      const analyticsData = this._getMockAnalyticsReport(startDate, endDate, igData.followersCount, false);
      return {
        ...igData,
        analytics: analyticsData
      };
    }
  }

  async getAnalyticsReport(igAccountId, accessToken, startDate, endDate, currentFollowersCount, socialAccountId = null) {
    if (accessToken && accessToken.startsWith('mock-')) {
      return this._getMockAnalyticsReport(startDate, endDate, currentFollowersCount);
    }

    try {
      const { start, end } = this._resolveDates(startDate, endDate);
      const dailyMap = this._initializeDailyMap(start, end);

      let missingRanges = [{ start, end }];

      if (socialAccountId) {
        const existingAnalytics = await socialAccountRepository.findAnalyticsInRange(socialAccountId, start, end);
        
        existingAnalytics.forEach(record => {
          if (record.socialAnalytics?.audienceDemographicsJson) {
            try {
              const data = JSON.parse(record.socialAnalytics.audienceDemographicsJson);
              const growth = data.growth || [];
              growth.forEach(day => {
                if (dailyMap[day.date] && !dailyMap[day.date]._fromDb) {
                  Object.assign(dailyMap[day.date], day);
                  if (day.views > 0 || day.pageVisits > 0 || day.acquired > 0 || day.totalClicks > 0) {
                    dailyMap[day.date]._fromDb = true;
                  }
                }
              });
            } catch (e) {
              console.error('[Instagram Analytics] Failed to parse DB JSON:', e);
            }
          }
        });

        missingRanges = this._calculateMissingRanges(dailyMap, start, end);
      }

      console.log(`[Instagram Analytics] Smart Sync: Requesting ${missingRanges.length} missing ranges from API for ${igAccountId}`);

      // Fetch real account insights
      const insights = await instagramGateway.getAccountInsights(igAccountId, accessToken, start, end).catch(() => []);
      for (const item of insights) {
        if (!item.values) continue;
        for (const val of item.values) {
          const dateStr = val.end_time.split('T')[0];
          if (dailyMap[dateStr]) {
            if (item.name === 'impressions') {
              dailyMap[dateStr].views = val.value || 0;
            } else if (item.name === 'reach') {
              dailyMap[dateStr].pageVisits = val.value || 0;
            } else if (item.name === 'profile_views') {
              dailyMap[dateStr].totalClicks = val.value || 0;
            }
          }
        }
      }

      // Set follower change to 0 if not fetched
      Object.keys(dailyMap).forEach((dateStr) => {
        const d = dailyMap[dateStr];
        if (d.acquired === 0 && d.lost === 0) {
          d.acquired = 0;
          d.lost = 0;
        }
      });

      const feedResult = await instagramGateway.getInstagramMediaFeed(igAccountId, accessToken, null, 100).catch(() => ({ data: [] }));
      const feedStats = this._processFeed(feedResult.data || [], dailyMap);

      const sortedDates = Object.keys(dailyMap).sort().map(d => {
        const { _fromDb, ...cleanData } = dailyMap[d];
        return cleanData;
      });

      return this._calculateTotalsAndFormatResponse(sortedDates, currentFollowersCount, feedStats);
    } catch (error) {
      console.error('Error fetching Instagram Analytics:', error);
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
        name: new Date(time).toLocaleDateString(DEFAULT_CONFIG.LOCALE || 'vi-VN', { month: 'short', day: 'numeric', timeZone: 'UTC' }),
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
      const postDateStr = new Date(post.timestamp).toISOString().split('T')[0];
      if (dailyMap[postDateStr]) {
        dailyMap[postDateStr].totalContent += 1;
        stats.totalPostsInPeriod++;

        const commentCount = post.comments_count || 0;
        const reactionCount = post.like_count || 0;
        const shareCount = 0; // Instagram Graph API không trực tiếp trả về share count cho feed item thông thường qua field này

        dailyMap[postDateStr].reactions += reactionCount;
        dailyMap[postDateStr].comments += commentCount;
        dailyMap[postDateStr].shares += shareCount;

        stats.totalReactions += reactionCount;
        stats.totalComments += commentCount;
        stats.totalShares += shareCount;

        if (post.media_type === 'CAROUSEL_ALBUM') stats.albumCount++;
        else stats.imageCount++;
      }
    }
    return stats;
  }

  _calculateTotalsAndFormatResponse(sortedDates, currentFollowersCount, feedStats) {
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
        typesBreakdown
        // viewsBreakdown (organic/promoted split) removed — this API never
        // fetches Instagram's organic/paid impressions insight metrics, so
        // the 85/15 split here was a fabricated constant presented as real
        // data (#69). Add it back only once backed by a real API call.
      }
    };
  }
}

module.exports = new InstagramAnalyticsService();
