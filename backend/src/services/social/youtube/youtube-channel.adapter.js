const BaseChannelAdapter = require('../../../core/insights/base-channel.adapter');
const { PLATFORMS } = require('../../../utils/constants');

class YouTubeChannelAdapter extends BaseChannelAdapter {
  get platform() {
    return PLATFORMS.YOUTUBE;
  }

  getPrismaModel(client) {
    return client.channelMetricDaily;
  }

  get supportsBackfill() {
    return true;
  }

  buildCurrent(analyticsData) {
    const statistics = analyticsData?.statistics || {};
    return {
      staticColumns: { totalVideosCount: parseInt(statistics.videoCount) || 0 },
      reconstructible: [
        {
          column: 'subscribersCount',
          currentValue: parseInt(statistics.subscriberCount) || 0,
          gainedKey: 'subscribersGained',
          lostKey: 'subscribersLost',
          emitDeltaColumns: true
        },
        {
          column: 'totalViewsCount',
          currentValue: parseInt(statistics.viewCount) || 0,
          gainedKey: 'views',
          emitDeltaColumns: false
        }
      ]
    };
  }

  buildDailyRows(analyticsData) {
    const growthRows = Array.isArray(analyticsData?.growthRows)
      ? analyticsData.growthRows
      : Array.isArray(analyticsData?.growth)
      ? analyticsData.growth
      : [];

    return growthRows.map((row) => ({ ...row, columns: {} }));
  }
}

module.exports = YouTubeChannelAdapter;
