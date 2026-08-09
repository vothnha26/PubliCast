const BaseChannelAdapter = require('../../../core/insights/base-channel.adapter');
const { PLATFORMS } = require('../../../utils/constants');

class InstagramChannelAdapter extends BaseChannelAdapter {
  get platform() {
    return PLATFORMS.INSTAGRAM;
  }

  getPrismaModel(client) {
    return client.channelMetricDaily;
  }

  get supportsBackfill() {
    return false;
  }

  buildCurrent(analyticsData) {
    const stats = analyticsData?.accountStats || {};
    return {
      staticColumns: {
        mediaCount: parseInt(stats.media_count || 0, 10)
      },
      reconstructible: [
        {
          column: 'followersCount',
          currentValue: parseInt(stats.followers_count || 0, 10),
          gainedKey: 'followersGained',
          lostKey: 'followersLost',
          emitDeltaColumns: true
        },
        {
          column: 'reachCount',
          currentValue: parseInt(stats.reach || 0, 10),
          gainedKey: 'reach',
          emitDeltaColumns: false
        }
      ]
    };
  }

  buildDailyRows(analyticsData) {
    const dailyRows = Array.isArray(analyticsData?.dailyRows) ? analyticsData.dailyRows : [];
    return dailyRows.map((row) => ({ ...row, columns: {} }));
  }
}

module.exports = InstagramChannelAdapter;
