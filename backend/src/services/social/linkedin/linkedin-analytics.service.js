const linkedinGateway = require('./linkedin.gateway');
const socialAccountRepository = require('../../../repositories/social/social-account.repository');
const { PLATFORMS, DEFAULT_CONFIG } = require('../../../utils/constants');
const logger = require('../../../utils/logger');

class LinkedInAnalyticsService {
  _getEmptyChannelInfo(accessToken, account = null) {
    return {
      pageId: account?.platformAccountId || 'mock-linkedin-id-123',
      username: account?.username || 'linkedin_user',
      displayName: account?.displayName || 'LinkedIn Account',
      profilePictureUrl: account?.profilePictureUrl || '',
      followersCount: 0,
      connectionsCount: 0,
      industry: account?.industry || 'Technology'
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
    return this._calculateTotalsAndFormatResponse(sortedDates, currentFollowers, feedStats);
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

    const memberInfo = await linkedinGateway.getMemberProfile(auth.accessToken);
    
    return {
      pageId: memberInfo.id,
      username: memberInfo.displayName.toLowerCase().replace(/\s+/g, '_'),
      displayName: memberInfo.displayName,
      profilePictureUrl: memberInfo.profilePictureUrl || '',
      followersCount: memberInfo.followersCount || 0,
      connectionsCount: memberInfo.connectionsCount || 0,
      industry: memberInfo.industry || 'Technology'
    };
  }

  async connectChannel(brandId, code, redirectUri) {
    const tokenData = await linkedinGateway.exchangeCodeForToken(code, redirectUri);
    const memberInfo = await linkedinGateway.getMemberProfile(tokenData.access_token);

    const pageData = {
      pageId: memberInfo.id,
      username: memberInfo.displayName.toLowerCase().replace(/\s+/g, '_'),
      displayName: memberInfo.displayName,
      profilePictureUrl: memberInfo.profilePictureUrl || '',
      followersCount: memberInfo.followersCount || 0,
      connectionsCount: memberInfo.connectionsCount || 0,
      industry: memberInfo.industry || 'Technology'
    };

    const { ConnectionConflictGuard, ConnectionConflictError } = require('../connection-conflict.guard');
    const conflictResult = await ConnectionConflictGuard.validateConflict(brandId, PLATFORMS.LINKEDIN, pageData.pageId);
    
    if (conflictResult.conflict) {
      throw new ConnectionConflictError(
        conflictResult.type,
        pageData.displayName,
        pageData.pageId,
        PLATFORMS.LINKEDIN,
        conflictResult.existingAccount.brand.name
      );
    }

    return socialAccountRepository.upsertLinkedInAccount(brandId, pageData, {
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expiry_date: tokenData.expires_in ? Date.now() + (tokenData.expires_in * 1000) : null,
      scope: tokenData.scope || 'w_member_social profile openid email'
    });
  }

  async syncChannelMetrics(socialAccountId, startDate, endDate) {
    const account = await socialAccountRepository.findById(socialAccountId);
    if (!account || account.platform !== PLATFORMS.LINKEDIN) {
      throw new Error('Social account not found or is not a LinkedIn account');
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
      return socialAccountRepository.upsertLinkedInAccount(account.brandId, accountData, {
        access_token: account.accessToken,
        refresh_token: account.refreshToken
      }, { enqueueSync: false });
    }

    const memberInfo = await linkedinGateway.getMemberProfile(account.accessToken);
    const analyticsData = await this.getAnalyticsReport({ accessToken: account.accessToken }, startDate, endDate, memberInfo.followersCount);

    const accountData = {
      pageId: memberInfo.id,
      username: memberInfo.displayName.toLowerCase().replace(/\s+/g, '_'),
      displayName: memberInfo.displayName,
      profilePictureUrl: memberInfo.profilePictureUrl || account.profilePictureUrl,
      followersCount: memberInfo.followersCount || 0,
      connectionsCount: memberInfo.connectionsCount || 0,
      industry: memberInfo.industry || 'Technology',
      analytics: analyticsData
    };

    // enqueueSync: false — đây CHÍNH LÀ sync job đang chạy; xem ghi chú tương tự ở
    // youtube-analytics.service.js syncChannelMetrics.
    return socialAccountRepository.upsertLinkedInAccount(account.brandId, accountData, {
      access_token: account.accessToken,
      refresh_token: account.refreshToken
    }, { enqueueSync: false });
  }

  async getAnalyticsReport(auth, startDate, endDate, currentFollowers) {
    // LinkedIn's real analytics (Organic Follower Statistics / Share
    // Statistics) require Marketing Developer Platform partner access, which
    // this integration does not have — there is no real data source to
    // switch to yet. Previously this returned the same all-zero mock report
    // unconditionally, even for real (non-mock-token) accounts, with no
    // signal that the numbers weren't real (#69). isMock now makes that
    // explicit so callers/UI can render an "unavailable" state instead of
    // presenting all-zero data as if it were measured.
    if (!(auth?.accessToken && auth.accessToken.startsWith('mock-'))) {
      logger.warn('[LinkedInAnalyticsService] getAnalyticsReport called for a real account — LinkedIn analytics API is not integrated, returning isMock:true placeholder data.');
    }
    return { ...this._getMockAnalyticsReport(startDate, endDate, currentFollowers), isMock: true };
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
        sharesPerPost
        // viewsBreakdown (organic/promoted split) removed — no real
        // organic/sponsored breakdown source is fetched here, so the 90/10
        // split was a fabricated constant presented as real data (#69).
      }
    };
  }
}

module.exports = new LinkedInAnalyticsService();
