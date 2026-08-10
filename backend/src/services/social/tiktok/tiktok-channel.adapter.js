const BaseChannelAdapter = require('../../../core/insights/base-channel.adapter');
const { PLATFORMS } = require('../../../utils/constants');

class TikTokChannelAdapter extends BaseChannelAdapter {
  get platform() {
    return PLATFORMS.TIKTOK;
  }

  getPrismaModel(client) {
    return client.channelMetricDaily;
  }

  get supportsBackfill() {
    return false;
  }

  buildCurrent(analyticsData) {
    const currentFollowers = analyticsData?.followersCount ?? analyticsData?.statistics?.followersCount ?? 0;
    const currentFollowing = analyticsData?.followingCount ?? analyticsData?.statistics?.followingCount ?? 0;
    const currentLikes = analyticsData?.likesCount ?? analyticsData?.statistics?.likesCount ?? 0;
    const currentVideos = analyticsData?.videoCount ?? analyticsData?.statistics?.videoCount ?? 0;

    return {
      staticColumns: {
        followingCount: parseInt(currentFollowing, 10) || 0,
        likesCount: parseInt(currentLikes, 10) || 0,
        videoCount: parseInt(currentVideos, 10) || 0
      },
      reconstructible: [
        {
          column: 'followersCount',
          currentValue: parseInt(currentFollowers, 10) || 0,
          gainedKey: 'followersGained',
          lostKey: 'followersLost',
          emitDeltaColumns: true
        }
      ]
    };
  }

  buildDailyRows(analyticsData) {
    const growthRows = Array.isArray(analyticsData?.growthRows)
      ? analyticsData.growthRows
      : Array.isArray(analyticsData?.analytics?.growth)
      ? analyticsData.analytics.growth
      : Array.isArray(analyticsData?.growth)
      ? analyticsData.growth
      : [];

    return growthRows.map((row) => ({
      date: row.date,
      followersGained: row.acquired ?? null,
      followersLost: row.lost ?? null,
      columns: {
        views: row.views ?? null,
        likes: row.likes ?? null,
        comments: row.comments ?? null,
        shares: row.shares ?? null
      }
    }));
  }
}

module.exports = TikTokChannelAdapter;
