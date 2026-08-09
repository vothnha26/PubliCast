const BaseChannelAdapter = require('../../../core/insights/base-channel.adapter');
const { PLATFORMS } = require('../../../utils/constants');

/**
 * BlueskyChannelAdapter
 * Concrete Adapter cho Bluesky Channel Snapshots.
 * Đăng ký vào ChannelAdapterFactory trong Core Insights.
 */
class BlueskyChannelAdapter extends BaseChannelAdapter {
  get platform() {
    return PLATFORMS.BLUESKY;
  }

  getPrismaModel(client) {
    return client.blueskyChannelSnapshot;
  }

  get supportsBackfill() {
    return false;
  }

  buildCurrent(analyticsData) {
    const summary = analyticsData?.summary || {};
    const accountStats = analyticsData?.accountStats || {};

    const followers = summary.followersCount || accountStats.followersCount || accountStats.followers_count || 0;
    const mediaCount = summary.totalContent || summary.postsCount || accountStats.postsCount || 0;

    return {
      staticColumns: {
        mediaCount: parseInt(mediaCount || 0, 10)
      },
      reconstructible: [
        {
          column: 'followersCount',
          currentValue: parseInt(followers || 0, 10),
          gainedKey: 'followersGained',
          lostKey: 'followersLost',
          emitDeltaColumns: true
        },
        {
          column: 'views',
          currentValue: parseInt(summary.views || 0, 10),
          gainedKey: 'views',
          emitDeltaColumns: false
        }
      ]
    };
  }

  buildDailyRows(analyticsData) {
    const growth = Array.isArray(analyticsData?.growth) ? analyticsData.growth : [];
    return growth.map((row) => ({
      date: row.date,
      columns: {
        likes: parseInt(row.reactions || row.likes || 0, 10),
        replies: parseInt(row.comments || row.replies || 0, 10),
        reposts: parseInt(row.shares || row.reposts || 0, 10),
        views: parseInt(row.views || 0, 10)
      }
    }));
  }
}

module.exports = BlueskyChannelAdapter;
