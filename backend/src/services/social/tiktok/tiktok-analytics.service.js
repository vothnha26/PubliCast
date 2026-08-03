const tiktokGateway = require('./tiktok.gateway');
const socialAccountRepository = require('../../../repositories/social/social-account.repository');
const DistributedLockService = require('../distributed-lock.service');
const { PLATFORMS, DEFAULT_CONFIG, LOCK_CONFIG } = require('../../../utils/constants');
const logger = require('../../../utils/logger');

let redisClient = null;
try {
  redisClient = require('../../../config/redis');
} catch (_) {
  // Redis unavailable (e.g. some test environments) — lock is skipped below,
  // refresh proceeds unlocked rather than hard-failing the whole sync.
}

class TikTokAnalyticsService {
  constructor() {
    this.lockService = redisClient ? new DistributedLockService(redisClient) : null;
  }

  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  _getEmptyChannelInfo(accessToken, account = null) {
    return {
      pageId: account?.platformAccountId || 'mock-tiktok-page-id',
      username: account?.username || 'tiktok_user',
      displayName: account?.displayName || 'TikTok Account',
      profilePictureUrl: account?.profilePictureUrl || 'https://images.unsplash.com/photo-1598550476439-6847785fce6e?w=150&auto=format&fit=crop&q=60',
      followersCount: 0,
      followingCount: 0,
      likesCount: 0,
      videoCount: 0
    };
  }

  _getMockAnalyticsReport(startDate, endDate, currentFollowers) {
    const { start, end } = this._resolveDates(startDate, endDate);
    const dailyMap = this._initializeDailyMap(start, end);
    
    const feedStats = {
      totalVideosInPeriod: 0,
      totalViews: 0,
      totalLikes: 0,
      totalComments: 0,
      totalShares: 0
    };

    const sortedDates = Object.keys(dailyMap).sort().map(d => dailyMap[d]);
    return this._calculateTotalsAndFormatResponse(sortedDates, 0, feedStats);
  }

  async getChannelInfo(auth, startDate, endDate, account = null) {
    if (auth.accessToken && auth.accessToken.startsWith('mock-')) {
      const channelInfo = this._getEmptyChannelInfo(auth.accessToken, account);
      const analyticsData = this._getMockAnalyticsReport(startDate, endDate, channelInfo.followersCount);
      return {
        ...channelInfo,
        analytics: analyticsData
      };
    }

    const userInfo = await tiktokGateway.getUserInfo(auth.accessToken);
    
    return {
      pageId: userInfo.open_id,
      username: userInfo.username || userInfo.display_name || 'TikTok User',
      displayName: userInfo.display_name || 'TikTok User',
      profilePictureUrl: userInfo.avatar_url || '',
      followersCount: userInfo.follower_count || 0,
      followingCount: userInfo.following_count || 0,
      likesCount: userInfo.likes_count || 0,
      videoCount: userInfo.video_count || 0
    };
  }

  async connectChannel(brandId, code, redirectUri, codeVerifier) {
    const tokenData = await tiktokGateway.exchangeCodeForToken(code, redirectUri, codeVerifier);
    const userInfo = await tiktokGateway.getUserInfo(tokenData.access_token);

    const pageData = {
      pageId: userInfo.open_id,
      username: userInfo.username || userInfo.display_name || 'TikTok User',
      displayName: userInfo.display_name || 'TikTok User',
      profilePictureUrl: userInfo.avatar_url || '',
      followersCount: userInfo.follower_count || 0,
      followingCount: userInfo.following_count || 0,
      likesCount: userInfo.likes_count || 0,
      videoCount: userInfo.video_count || 0
    };

    const { ConnectionConflictGuard, ConnectionConflictError } = require('../connection-conflict.guard');
    const conflictResult = await ConnectionConflictGuard.validateConflict(brandId, PLATFORMS.TIKTOK, pageData.pageId);
    
    if (conflictResult.conflict) {
      throw new ConnectionConflictError(
        conflictResult.type,
        pageData.displayName,
        pageData.pageId,
        PLATFORMS.TIKTOK,
        conflictResult.existingAccount.brand.name
      );
    }

    return socialAccountRepository.upsertTikTokAccount(brandId, pageData, {
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expiry_date: tokenData.expires_in ? Date.now() + (tokenData.expires_in * 1000) : null,
      scope: tokenData.scope || 'user.info.basic,user.info.stats,video.list,video.publish'
    });
  }

  /**
   * TikTok rotates refresh_token on every use — each refresh call invalidates
   * the refresh_token that was used to make it. Two concurrent callers (e.g.
   * a scheduled metric-sync and a manual sync) reading the same expired
   * account both refresh with the same (still-valid) old refresh_token; both
   * receive new tokens, and whichever updateTokens() writes last wins,
   * leaving the DB holding a refresh_token TikTok already invalidated — the
   * account is bricked until the user reconnects. This closes that race with
   * a per-account lock, re-reading the latest token from DB after acquiring
   * it (another caller may have already refreshed while we waited) (#62).
   */
  async getOrRefreshAccount(account) {
    if (!account) return null;

    const tokenExpiresAt = account.tokenExpiresAt;
    const isExpired = tokenExpiresAt && (new Date(tokenExpiresAt).getTime() - 5 * 60 * 1000) < Date.now();

    if (!isExpired || !account.refreshToken) {
      return account;
    }

    const lockKey = `${LOCK_CONFIG.TIKTOK_REFRESH.PREFIX}${account.id}`;
    const token = this.lockService ? await this.lockService.acquireLock(lockKey, LOCK_CONFIG.TIKTOK_REFRESH.TTL_SEC) : 'no-lock';

    if (!token) {
      // Another request is already refreshing this account — wait briefly for
      // it to finish and persist the new token, then read that instead of
      // racing our own refresh call against theirs.
      const deadline = Date.now() + LOCK_CONFIG.TIKTOK_REFRESH.POLL_TIMEOUT_MS;
      while (Date.now() < deadline) {
        await this._sleep(LOCK_CONFIG.TIKTOK_REFRESH.POLL_INTERVAL_MS);
        if (!(await this.lockService.isLocked(lockKey))) {
          const fresh = await socialAccountRepository.findById(account.id);
          return fresh || account;
        }
      }
      // Lock winner is taking unusually long — fall back to the stale
      // account rather than blocking this request indefinitely.
      return account;
    }

    try {
      // Double-check: another caller may have refreshed (and released the
      // lock) between our isExpired check and acquiring this lock.
      const latest = await socialAccountRepository.findById(account.id);
      const stillExpired = !latest?.tokenExpiresAt ||
        (new Date(latest.tokenExpiresAt).getTime() - 5 * 60 * 1000) < Date.now();
      if (!stillExpired) {
        return latest;
      }

      logger.debug(`[TikTok Token Refresh] Token for account ${account.id} is expired or expiring soon. Refreshing...`);
      const refreshed = await tiktokGateway.refreshAccessToken(latest.refreshToken);

      const accessToken = refreshed.access_token;
      const refreshToken = refreshed.refresh_token || latest.refreshToken;
      const expiryDate = refreshed.expires_in ? Date.now() + (refreshed.expires_in * 1000) : null;

      const updatedAccount = await socialAccountRepository.updateTokens(account.id, {
        access_token: accessToken,
        refresh_token: refreshToken,
        expiry_date: expiryDate
      });

      logger.debug(`[TikTok Token Refresh] Successfully refreshed token for account ${account.id}`);
      return updatedAccount;
    } catch (err) {
      console.error(`[TikTok Token Refresh] Failed to refresh token for account ${account.id}:`, err.message);

      if (err.code === 'invalid_grant') {
        // The refresh_token itself was rejected (already used/revoked) —
        // this account cannot self-heal; mark it so the UI can prompt the
        // user to reconnect instead of silently limping along on an
        // already-expired access token.
        await socialAccountRepository.markNeedsReauth(account.id).catch(() => {});
      }

      // Fallback to returning original account
      return account;
    } finally {
      if (this.lockService) {
        await this.lockService.releaseLock(lockKey, token).catch(() => {});
      }
    }
  }
  async syncChannelMetrics(socialAccountId, startDate, endDate) {
    let account = await socialAccountRepository.findById(socialAccountId);
    if (!account || account.platform !== PLATFORMS.TIKTOK) {
      throw new Error('Social account not found or is not a TikTok account');
    }

    if (account.accessToken && account.accessToken.startsWith('mock-')) {
      const channelInfo = this._getEmptyChannelInfo(account.accessToken, account);
      const analyticsData = this._getMockAnalyticsReport(startDate, endDate, channelInfo.followersCount);
      const accountData = {
        ...channelInfo,
        analytics: analyticsData
      };
      // enqueueSync: false — đây CHÍNH LÀ sync job đang chạy; xem ghi chú tương tự ở
      // youtube-analytics.service.js syncChannelMetrics.
      return socialAccountRepository.upsertTikTokAccount(account.brandId, accountData, {
        access_token: account.accessToken,
        refresh_token: account.refreshToken
      }, { enqueueSync: false });
    }

    // Refresh token if expired according to metadata
    account = await this.getOrRefreshAccount(account);

    let userInfo;
    try {
      userInfo = await tiktokGateway.getUserInfo(account.accessToken);
    } catch (error) {
      // Force refresh if the token is invalid (even if database metadata said it was valid)
      const isTokenError = error.status === 401 || error.code === 'access_token_invalid';
      if (isTokenError && account.refreshToken) {
        logger.debug(`[TikTok Sync] getUserInfo failed with token error. Attempting force refresh...`);
        try {
          const refreshed = await tiktokGateway.refreshAccessToken(account.refreshToken);
          const accessToken = refreshed.access_token;
          const refreshToken = refreshed.refresh_token || account.refreshToken;
          const expiryDate = refreshed.expires_in ? Date.now() + (refreshed.expires_in * 1000) : null;

          account = await socialAccountRepository.updateTokens(account.id, {
            access_token: accessToken,
            refresh_token: refreshToken,
            expiry_date: expiryDate
          });

          userInfo = await tiktokGateway.getUserInfo(account.accessToken);
        } catch (refreshError) {
          console.error(`[TikTok Sync] Force refresh failed:`, refreshError.message);
          throw error; // Throw original token error
        }
      } else {
        throw error;
      }
    }

    const analyticsData = await this.getAnalyticsReport({ accessToken: account.accessToken }, startDate, endDate, userInfo.follower_count);

    const accountData = {
      pageId: userInfo.open_id,
      username: userInfo.username || userInfo.display_name || account.username,
      displayName: userInfo.display_name || account.displayName,
      profilePictureUrl: userInfo.avatar_url || account.profilePictureUrl,
      followersCount: userInfo.follower_count || 0,
      followingCount: userInfo.following_count || 0,
      likesCount: userInfo.likes_count || 0,
      videoCount: userInfo.video_count || 0,
      analytics: analyticsData
    };

    // enqueueSync: false — đây CHÍNH LÀ sync job đang chạy; xem ghi chú tương tự ở
    // youtube-analytics.service.js syncChannelMetrics.
    return socialAccountRepository.upsertTikTokAccount(account.brandId, accountData, {
      access_token: account.accessToken,
      refresh_token: account.refreshToken
    }, { enqueueSync: false });
  }
  async getAnalyticsReport(auth, startDate, endDate, currentFollowers) {
    if (auth && auth.accessToken && auth.accessToken.startsWith('mock-')) {
      return this._getMockAnalyticsReport(startDate, endDate, currentFollowers);
    }

    try {
      const { start, end } = this._resolveDates(startDate, endDate);
      
      // We will fetch up to 100 recent videos to build a time-series simulation based on actual video performance.
      let allVideos = [];
      try {
        let cursor = 0;
        let hasMore = true;
        
        while (hasMore && allVideos.length < 100) {
          const res = await tiktokGateway.getVideoList(auth.accessToken, cursor, 20);
          if (res && res.videos && res.videos.length > 0) {
            allVideos = allVideos.concat(res.videos);
            hasMore = res.has_more;
            cursor = res.cursor;
          } else {
            hasMore = false;
          }
        }
      } catch (e) {
        console.warn('Failed to fetch videos for analytics:', e.message);
      }

      const dailyMap = this._initializeDailyMap(start, end);
      const stats = this._processVideosForAnalytics(allVideos, dailyMap, start, end);

      const sortedDates = Object.keys(dailyMap).sort().map(d => dailyMap[d]);
      return this._calculateTotalsAndFormatResponse(sortedDates, currentFollowers, stats);
    } catch (error) {
      console.error('Error generating TikTok Analytics:', error.message);
      return null;
    }
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
        name: new Date(time).toLocaleDateString(DEFAULT_CONFIG.LOCALE, { month: 'short', day: 'numeric', timeZone: 'UTC' }),
        followers: 0,
        views: 0,
        reach: 0,
        totalContent: 0,
        acquired: 0,
        lost: 0,
        totalClicks: 0,
        likes: 0,
        comments: 0,
        shares: 0
      };
    }
    return dailyMap;
  }

  _processVideosForAnalytics(videos, dailyMap, start, end) {
    const stats = {
      totalPostsInPeriod: 0,
      totalViews: 0,
      totalLikes: 0,
      totalComments: 0,
      totalShares: 0
    };

    for (const video of videos) {
      const videoDate = new Date(video.create_time * 1000);
      const dateStr = videoDate.toISOString().split('T')[0];

      if (dateStr >= start && dateStr <= end) {
        if (dailyMap[dateStr]) {
          dailyMap[dateStr].totalContent += 1;
          dailyMap[dateStr].views += video.view_count || 0;
          dailyMap[dateStr].reach += Math.round((video.view_count || 0) * 0.85); // Approximate reach
          dailyMap[dateStr].likes += video.like_count || 0;
          dailyMap[dateStr].comments += video.comment_count || 0;
          dailyMap[dateStr].shares += video.share_count || 0;
          dailyMap[dateStr].totalClicks += Math.round((video.like_count || 0) * 0.1); // Approximate clicks
          dailyMap[dateStr].acquired += Math.round((video.like_count || 0) * 0.05); // Approximate new followers from this video

          stats.totalPostsInPeriod += 1;
          stats.totalViews += video.view_count || 0;
          stats.totalLikes += video.like_count || 0;
          stats.totalComments += video.comment_count || 0;
          stats.totalShares += video.share_count || 0;
        }
      }
    }

    Object.keys(dailyMap).forEach(dateStr => {
      const day = dailyMap[dateStr];
      if (day.views === 0) {
        day.views = 0;
        day.reach = 0;
        day.likes = 0;
        day.acquired = 0;
      }
    });

    return stats;
  }

  _calculateTotalsAndFormatResponse(sortedDates, currentFollowersCount, stats) {
    let tempFollowers = currentFollowersCount;
    for (let i = sortedDates.length - 1; i >= 0; i--) {
      sortedDates[i].followers = tempFollowers;
      tempFollowers = Math.max(0, tempFollowers - (sortedDates[i].acquired || 0) + (sortedDates[i].lost || 0));
    }

    const totalViews = sortedDates.reduce((sum, d) => sum + d.views, 0);
    const totalReach = sortedDates.reduce((sum, d) => sum + d.reach, 0);
    const totalClicks = sortedDates.reduce((sum, d) => sum + d.totalClicks, 0);
    const totalAcquired = sortedDates.reduce((sum, d) => sum + d.acquired, 0);
    const totalLost = sortedDates.reduce((sum, d) => sum + d.lost, 0);
    const totalPosts = sortedDates.reduce((sum, d) => sum + d.totalContent, 0);
    const totalLikes = sortedDates.reduce((sum, d) => sum + d.likes, 0);
    const totalComments = sortedDates.reduce((sum, d) => sum + d.comments, 0);
    const totalShares = sortedDates.reduce((sum, d) => sum + d.shares, 0);

    const daysCount = sortedDates.length || 1;
    const averageDailyNewFollowers = Math.round((totalAcquired - totalLost) / daysCount);
    const dailyPageViews = parseFloat((totalViews / daysCount).toFixed(2));
    const dailyPosts = parseFloat((totalPosts / daysCount).toFixed(2));
    const postsPerWeek = parseFloat((dailyPosts * 7).toFixed(2));

    const dailyLikes = parseFloat((totalLikes / daysCount).toFixed(2));
    const likesPerPost = totalPosts ? parseFloat((totalLikes / totalPosts).toFixed(2)) : 0;
    const dailyComments = parseFloat((totalComments / daysCount).toFixed(2));
    const commentsPerPost = totalPosts ? parseFloat((totalComments / totalPosts).toFixed(2)) : 0;
    const sharesPerDay = parseFloat((totalShares / daysCount).toFixed(2));
    const sharesPerPost = totalPosts ? parseFloat((totalShares / totalPosts).toFixed(2)) : 0;

    return {
      summary: {
        followers: currentFollowersCount,
        views: totalViews,
        reach: totalReach,
        totalContent: totalPosts,
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
        reach: d.reach,
        totalContent: d.totalContent,
        likes: d.likes,
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
        reach: d.reach,
        totalContent: d.totalContent
      })),
      postsPeriod: sortedDates.map(d => ({
        date: d.date,
        name: d.name,
        views: d.views,
        likes: d.likes,
        comments: d.comments,
        shares: d.shares,
        totalContent: d.totalContent
      })),
      interactions: {
        likes: totalLikes,
        comments: totalComments,
        shares: totalShares,
        clicks: totalClicks,
        posts: totalPosts,
        dailyLikes,
        likesPerPost,
        dailyComments,
        commentsPerPost,
        sharesPerDay,
        sharesPerPost,
        viewsBreakdown: {
          organic: 85,
          promoted: 15
        }
      }
    };
  }
}

module.exports = new TikTokAnalyticsService();
