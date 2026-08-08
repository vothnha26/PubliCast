const BaseChannelAdapter = require('../../../core/insights/base-channel.adapter');
const { PLATFORMS } = require('../../../utils/constants');

class FacebookChannelAdapter extends BaseChannelAdapter {
  get platform() {
    return PLATFORMS.FACEBOOK;
  }

  getPrismaModel(client) {
    return client.facebookChannelSnapshot;
  }

  get supportsBackfill() {
    return true;
  }

  buildCurrent(analyticsData) {
    const currentFollowersCount = analyticsData?.currentFollowersCount ?? analyticsData?.statistics?.followersCount ?? 0;
    const currentLikesCount = analyticsData?.currentLikesCount ?? analyticsData?.statistics?.likesCount ?? 0;

    return {
      staticColumns: { likesCount: parseInt(currentLikesCount) || 0 },
      reconstructible: [
        {
          column: 'followersCount',
          currentValue: parseInt(currentFollowersCount) || 0,
          gainedKey: 'followersGained',
          lostKey: 'followersLost',
          emitDeltaColumns: true
        }
      ]
    };
  }

  buildDailyRows(analyticsData) {
    const balanceRows = Array.isArray(analyticsData?.balanceRows)
      ? analyticsData.balanceRows
      : Array.isArray(analyticsData?.balance)
      ? analyticsData.balance
      : [];

    const growthRows = Array.isArray(analyticsData?.growthRows)
      ? analyticsData.growthRows
      : Array.isArray(analyticsData?.growth)
      ? analyticsData.growth
      : [];

    const growthByDate = new Map((growthRows || []).map((row) => [row.date, row]));

    return balanceRows.map((balance) => {
      const growth = growthByDate.get(balance.date) || {};
      return {
        date: balance.date,
        followersGained: balance.acquired ?? null,
        followersLost: balance.lost ?? null,
        columns: {
          reach: growth.views ?? null,
          pageViews: growth.pageVisits ?? null,
          impressions: null
        }
      };
    });
  }
}

module.exports = FacebookChannelAdapter;
