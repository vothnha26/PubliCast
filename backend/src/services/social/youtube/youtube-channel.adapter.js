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
          // column must be exactly 'followersCount' — the shared
          // ChannelSnapshotRepository's FOLLOWER_COLUMNS set only recognizes
          // that literal name to route into the typed followersCount column;
          // any other name (this used to be 'subscribersCount', YouTube's
          // own terminology) silently falls through into the `metrics` JSON
          // blob instead, leaving the typed column stuck at 0 forever (bug
          // fixed 2026-08-10 — gainedKey/lostKey stay YouTube's own names
          // since those route into `metrics` either way, only `column` had
          // to match the follower-column contract).
          column: 'followersCount',
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
