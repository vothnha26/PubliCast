const prisma = require('../../config/prisma');

class AnalyticsFacade {
  /**
   * Aggregate analytics data for a brand within a date range and for specific platforms.
   * @param {string} brandId 
   * @param {Date} dateFrom 
   * @param {Date} dateTo 
   * @param {string[]} platforms - Array of platforms, e.g. ["Facebook", "YouTube"]
   */
  async getAggregatedData(brandId, dateFrom, dateTo, platforms) {
    // 1. Fetch Brand Info
    const brand = await prisma.brand.findUnique({
      where: { id: brandId }
    });

    // 2. Fetch connected SocialAccounts of the Brand
    const socialAccounts = await prisma.socialAccount.findMany({
      where: { 
        brandId,
        isConnected: true
      },
      include: {
        youtubeChannel: true,
        facebookPage: true,
        instagramAccount: true,
        tikTokAccount: true,
        linkedInAccount: true,
        telegramAccount: true,
        discordAccount: true
      }
    });

    // Map platforms to uppercase
    const selectedPlatformsUpper = platforms.map(p => p.toUpperCase());

    // Filter accounts by requested platforms
    const activeAccounts = socialAccounts.filter(acc => {
      let mappedPlatform = acc.platform;
      return selectedPlatformsUpper.includes(mappedPlatform);
    });

    // 3. Process channels details
    const channels = [];
    let totalFollowers = 0;
    const accountIds = activeAccounts.map(acc => acc.id);

    // Batched replacement for the old per-account analytics.findFirst x2
    // loop (#76) — one findMany for in-range records, one for the
    // any-time fallback, both grouped in memory by socialAccountId instead
    // of round-tripping the DB once per account.
    const inRangeAnalytics = accountIds.length > 0 ? await prisma.analytics.findMany({
      where: {
        socialAccountId: { in: accountIds },
        dateFrom: { gte: dateFrom },
        dateTo: { lte: dateTo }
      },
      include: { socialAnalytics: true },
      orderBy: { fetchedAt: 'desc' }
    }) : [];
    const anyTimeAnalytics = accountIds.length > 0 ? await prisma.analytics.findMany({
      where: { socialAccountId: { in: accountIds } },
      include: { socialAnalytics: true },
      orderBy: { fetchedAt: 'desc' }
    }) : [];

    // findMany + orderBy already sorts newest-first across all matched
    // accounts — keep only the first (newest) row seen per socialAccountId.
    const latestInRangeByAccount = new Map();
    for (const row of inRangeAnalytics) {
      if (!latestInRangeByAccount.has(row.socialAccountId)) {
        latestInRangeByAccount.set(row.socialAccountId, row);
      }
    }
    const latestAnyTimeByAccount = new Map();
    for (const row of anyTimeAnalytics) {
      if (!latestAnyTimeByAccount.has(row.socialAccountId)) {
        latestAnyTimeByAccount.set(row.socialAccountId, row);
      }
    }

    // Batched replacement for the old per-account fallback post.count loop —
    // groupBy gives per-platform counts in one query instead of N.
    const postCountsByPlatform = await prisma.post.groupBy({
      by: ['targetPlatforms'],
      where: {
        brandId,
        status: 'PUBLISHED',
        publishedAt: { gte: dateFrom, lte: dateTo }
      },
      _count: true
    });
    // targetPlatforms is a free-text comma-separated field (not a clean
    // groupBy key), so tally matches per platform in memory from the
    // grouped rows rather than issuing prisma.post.count() per account.
    const countPostsForPlatform = (platform) => postCountsByPlatform
      .filter(row => (row.targetPlatforms || '').includes(platform))
      .reduce((sum, row) => sum + row._count, 0);

    for (const acc of activeAccounts) {
      let followers = 0;
      if (acc.platform === 'YOUTUBE' && acc.youtubeChannel) {
        followers = acc.youtubeChannel.subscribersCount;
      } else if (acc.platform === 'FACEBOOK' && acc.facebookPage) {
        followers = acc.facebookPage.followersCount;
      } else if (acc.platform === 'INSTAGRAM' && acc.instagramAccount) {
        followers = acc.instagramAccount.followersCount;
      } else if (acc.platform === 'TIKTOK' && acc.tikTokAccount) {
        followers = acc.tikTokAccount.followersCount;
      } else if (acc.platform === 'LINKEDIN' && acc.linkedInAccount) {
        followers = acc.linkedInAccount.followersCount;
      } else if (acc.platform === 'TELEGRAM' && acc.telegramAccount) {
        followers = acc.telegramAccount.memberCount;
      } else if (acc.platform === 'DISCORD' && acc.discordAccount) {
        followers = acc.discordAccount.memberCount;
      }

      // Get analytics record for this account:
      // 1. Ưu tiên record mới nhất trong khoảng dateFrom-dateTo của report
      // 2. Fallback: lấy record mới nhất bất kỳ (tránh trả về 0 khi sync chưa đúng kỳ)
      const latestAnalytics = latestInRangeByAccount.get(acc.id) || latestAnyTimeByAccount.get(acc.id) || null;

      // Count posts published in this channel
      let postsCount = 0;
      if (latestAnalytics && latestAnalytics.socialAnalytics) {
        if (latestAnalytics.socialAnalytics.audienceDemographicsJson) {
          try {
            const rawJson = JSON.parse(latestAnalytics.socialAnalytics.audienceDemographicsJson);
            if (rawJson.summary && typeof rawJson.summary.totalContent === 'number') {
              postsCount = rawJson.summary.totalContent;
            }
          } catch (e) {
            // ignore
          }
        }
      }

      // Fallback: đếm số lượng post trong DB
      if (postsCount === 0) {
        postsCount = countPostsForPlatform(acc.platform);
      }

      let channelReach = 0;
      let channelImpressions = 0;
      let channelEngagements = 0;
      let channelLikes = 0;
      let channelComments = 0;
      let channelShares = 0;
      let channelClicks = 0;

      if (latestAnalytics && latestAnalytics.socialAnalytics) {
        const sa = latestAnalytics.socialAnalytics;
        channelReach = sa.reach || 0;
        channelImpressions = sa.impressions || 0;
        channelEngagements = sa.engagements || 0;
        channelLikes = sa.likes || 0;
        channelComments = sa.comments || 0;
        channelShares = sa.shares || 0;
        channelClicks = sa.clicks || 0;
        if (sa.followersTotal > 0) {
          followers = sa.followersTotal;
        }
      }

      totalFollowers += followers;

      // Calculate real engagement rate
      const engagementRate = latestAnalytics && latestAnalytics.socialAnalytics
        ? (latestAnalytics.socialAnalytics.engagementRate || (channelReach > 0 ? parseFloat(((channelEngagements / channelReach) * 100).toFixed(2)) : 0.0))
        : 0.0;

      let analyticsData = null;
      if (latestAnalytics && latestAnalytics.socialAnalytics && latestAnalytics.socialAnalytics.audienceDemographicsJson) {
        try {
          analyticsData = JSON.parse(latestAnalytics.socialAnalytics.audienceDemographicsJson);
        } catch (e) {
          console.error("Error parsing audienceDemographicsJson:", e);
        }
      }

      channels.push({
        platform: acc.platform,
        displayName: acc.displayName || acc.username,
        followers,
        postsCount,
        engagementRate: parseFloat(engagementRate.toFixed(2)),
        reach: channelReach,
        impressions: channelImpressions,
        engagements: channelEngagements,
        likes: channelLikes,
        comments: channelComments,
        shares: channelShares,
        clicks: channelClicks,
        analyticsData
      });
    }

    // 4. Query & Fetch published posts from all active channels to find top performing posts
    const allPlatformPosts = [];
    const socialPlatformFactory = require('../social/social-platform.factory');

    for (const acc of activeAccounts) {
      let followers = 0;
      if (acc.platform === 'YOUTUBE' && acc.youtubeChannel) {
        followers = acc.youtubeChannel.subscribersCount;
      } else if (acc.platform === 'FACEBOOK' && acc.facebookPage) {
        followers = acc.facebookPage.followersCount;
      } else if (acc.platform === 'INSTAGRAM' && acc.instagramAccount) {
        followers = acc.instagramAccount.followersCount;
      } else if (acc.platform === 'TIKTOK' && acc.tikTokAccount) {
        followers = acc.tikTokAccount.followersCount;
      } else if (acc.platform === 'LINKEDIN' && acc.linkedInAccount) {
        followers = acc.linkedInAccount.followersCount;
      } else if (acc.platform === 'TELEGRAM' && acc.telegramAccount) {
        followers = acc.telegramAccount.memberCount;
      } else if (acc.platform === 'DISCORD' && acc.discordAccount) {
        followers = acc.discordAccount.memberCount;
      }

      try {
        const service = socialPlatformFactory.getService(acc.platform);
        // Fetch published videos/posts from social platform API
        const apiResult = await service.getPublishedVideos(brandId, null, 20, acc.id);
        const apiPosts = apiResult?.videos || apiResult?.posts || apiResult?.data || [];

        if (Array.isArray(apiPosts)) {
          apiPosts.forEach(post => {
            const pubDate = post.publishedAt ? new Date(post.publishedAt) : null;
            // Check if post falls within the date range
            if (pubDate && pubDate >= dateFrom && pubDate <= dateTo) {
              const likes = post.likes || 0;
              const comments = post.comments || 0;
              const shares = post.shares || 0;
              const viewsOrReach = post.views || post.reach || 0;

              const denominator = viewsOrReach > 0 ? viewsOrReach : (followers || 1000);
              const engagementRate = parseFloat((((likes + comments + shares) / denominator) * 100).toFixed(2));

              allPlatformPosts.push({
                id: post.id || post.platformPostId,
                title: post.title || post.caption || 'Không có tiêu đề',
                caption: post.caption || '',
                platform: acc.platform,
                likes,
                comments,
                shares,
                engagementRate
              });
            }
          });
        }
      } catch (err) {
        console.warn(`[Report Sync] Failed to fetch live posts for platform ${acc.platform}:`, err.message);
      }
    }

    // Also fetch posts from our local database to ensure scheduled/published app posts are included
    const dbPosts = await prisma.post.findMany({
      where: {
        brandId,
        status: 'PUBLISHED',
        publishedAt: {
          gte: dateFrom,
          lte: dateTo
        }
      },
      take: 20,
      orderBy: {
        publishedAt: 'desc'
      }
    });

    // Pre-resolve (post, platform) -> platformPostId for every candidate
    // pair up front, so the Facebook/YouTube metric lookups below can be
    // batched by ID instead of one findFirst per post per platform (#76).
    const postPlatformPairs = [];
    for (const post of dbPosts) {
      let platforms = ['FACEBOOK'];
      if (post.targetPlatforms) {
        platforms = post.targetPlatforms.split(',').map(p => p.trim().toUpperCase()).filter(Boolean);
      }
      for (const platformUpper of platforms) {
        const isDuplicate = allPlatformPosts.some(ap => ap.platform === platformUpper && (ap.id === post.platformPostId || ap.id === post.id));
        if (isDuplicate) continue;

        let currentPlatformPostId = post.platformPostId;
        if (post.platformPostId && post.platformPostId.startsWith('{')) {
          try {
            const map = JSON.parse(post.platformPostId);
            currentPlatformPostId = map[platformUpper] || null;
          } catch (e) {
            // ignore
          }
        }
        postPlatformPairs.push({ post, platformUpper, currentPlatformPostId });
      }
    }

    const fbPostIds = postPlatformPairs
      .filter(p => p.platformUpper === 'FACEBOOK' && p.currentPlatformPostId)
      .map(p => p.currentPlatformPostId);
    const ytVideoIds = postPlatformPairs
      .filter(p => p.platformUpper === 'YOUTUBE' && p.currentPlatformPostId)
      .map(p => p.currentPlatformPostId);

    const fbMetrics = fbPostIds.length > 0 ? await prisma.facebookPostMetric.findMany({
      where: { platformPostId: { in: fbPostIds }, brandId }
    }) : [];
    const ytMetrics = ytVideoIds.length > 0 ? await prisma.trackedVideo.findMany({
      where: { videoId: { in: ytVideoIds }, brandId }
    }) : [];
    const fbMetricByPostId = new Map(fbMetrics.map(m => [m.platformPostId, m]));
    const ytMetricByVideoId = new Map(ytMetrics.map(m => [m.videoId, m]));

    for (const { post, platformUpper, currentPlatformPostId } of postPlatformPairs) {
      let likes = 0;
      let comments = 0;
      let shares = 0;
      let reachOrViews = 0;

      if (platformUpper === 'FACEBOOK' && currentPlatformPostId) {
        const fbMetric = fbMetricByPostId.get(currentPlatformPostId);
        if (fbMetric) {
          likes = fbMetric.likes || 0;
          comments = fbMetric.comments || 0;
          shares = fbMetric.shares || 0;
          reachOrViews = fbMetric.reach || 0;
        }
      } else if (platformUpper === 'YOUTUBE' && currentPlatformPostId) {
        const ytMetric = ytMetricByVideoId.get(currentPlatformPostId);
        if (ytMetric) {
          likes = ytMetric.lastLikes || 0;
          comments = ytMetric.lastComments || 0;
          reachOrViews = ytMetric.lastViews || 0;
        }
      }

      const denominator = reachOrViews > 0 ? reachOrViews : (totalFollowers || 1000);
      const engagementRate = parseFloat((((likes + comments + shares) / denominator) * 100).toFixed(2));

      allPlatformPosts.push({
        id: post.id,
        title: post.title,
        caption: post.caption,
        platform: platformUpper,
        likes,
        comments,
        shares,
        engagementRate
      });
    }

    // Sort by engagement rate descending and get top 5
    allPlatformPosts.sort((a, b) => b.engagementRate - a.engagementRate);
    const finalTopPosts = allPlatformPosts.slice(0, 5);

    // 5. Aggregate overall metrics
    let totalReach = 0;
    let totalImpressions = 0;
    let totalEngagements = 0;

    channels.forEach(ch => {
      totalReach += ch.reach;
      totalImpressions += ch.impressions;
      totalEngagements += ch.engagements;
    });

    const overallEngagementRate = totalReach > 0 
      ? parseFloat(((totalEngagements / totalReach) * 100).toFixed(2)) 
      : 0.0;

    return {
      brand: {
        id: brandId,
        name: brand?.name || 'PubliCast Brand'
      },
      overview: {
        reach: totalReach,
        impressions: totalImpressions,
        engagements: totalEngagements,
        engagementRate: overallEngagementRate
      },
      channels,
      topPosts: finalTopPosts
    };
  }
}

const analyticsFacade = new AnalyticsFacade();
module.exports = analyticsFacade;
