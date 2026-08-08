const BaseAudienceAdapter = require('../../../core/insights/base-audience.adapter');
const youtubeGateway = require('./youtube.gateway');
const { PLATFORMS, ANALYTICS } = require('../../../utils/constants');
const logger = require('../../../utils/logger');

class YouTubeAudienceAdapter extends BaseAudienceAdapter {
  get platform() {
    return PLATFORMS.YOUTUBE;
  }

  getPrismaModel(client) {
    return client.youTubeAudienceSnapshot;
  }

  /**
   * Truy vấn Demographics, Geography, Traffic Sources song song từ YouTube Analytics API
   */
  async fetchFromAPI(auth, context) {
    const defaultStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const defaultEnd = new Date().toISOString().split('T')[0];
    const start = context.startDate || defaultStart;
    const end = context.endDate || defaultEnd;

    try {
      const [demoRes, geoRes, trafficRes] = await Promise.all([
        youtubeGateway.getAnalyticsReportQuery(auth, {
          ids: 'channel==MINE',
          startDate: start,
          endDate: end,
          metrics: ANALYTICS.METRICS.YOUTUBE.VIEWER_PERCENTAGE,
          dimensions: `${ANALYTICS.DIMENSIONS.YOUTUBE.AGE_GROUP},${ANALYTICS.DIMENSIONS.YOUTUBE.GENDER}`,
          sort: `${ANALYTICS.DIMENSIONS.YOUTUBE.AGE_GROUP},${ANALYTICS.DIMENSIONS.YOUTUBE.GENDER}`
        }).catch(err => {
          logger.warn(`[YouTubeAudienceAdapter] Failed demographics fetch: ${err.message}`);
          return { data: { rows: [] } };
        }),

        youtubeGateway.getAnalyticsReportQuery(auth, {
          ids: 'channel==MINE',
          startDate: start,
          endDate: end,
          metrics: ANALYTICS.METRICS.YOUTUBE.VIEWS,
          dimensions: ANALYTICS.DIMENSIONS.YOUTUBE.COUNTRY,
          sort: ANALYTICS.SORT.YOUTUBE.VIEWS_DESC,
          maxResults: 10
        }).catch(err => {
          logger.warn(`[YouTubeAudienceAdapter] Failed geographic fetch: ${err.message}`);
          return { data: { rows: [] } };
        }),

        youtubeGateway.getAnalyticsReportQuery(auth, {
          ids: 'channel==MINE',
          startDate: start,
          endDate: end,
          metrics: `${ANALYTICS.METRICS.YOUTUBE.VIEWS},${ANALYTICS.METRICS.YOUTUBE.MINUTES_WATCHED}`,
          dimensions: ANALYTICS.DIMENSIONS.YOUTUBE.TRAFFIC_SOURCE,
          sort: ANALYTICS.SORT.YOUTUBE.VIEWS_DESC
        }).catch(err => {
          logger.warn(`[YouTubeAudienceAdapter] Failed traffic sources fetch: ${err.message}`);
          return { data: { rows: [] } };
        })
      ]);

      return {
        demographicsRows: demoRes.data?.rows || [],
        geographyRows: geoRes.data?.rows || [],
        trafficSourceRows: trafficRes.data?.rows || []
      };
    } catch (err) {
      logger.error(`[YouTubeAudienceAdapter] Error fetching API data: ${err.message}`);
      return { demographicsRows: [], geographyRows: [], trafficSourceRows: [] };
    }
  }

  /**
   * Chuẩn hóa dữ liệu thô từ API thành các JSON Objects có cấu trúc rõ ràng
   */
  normalize(rawData) {
    const demographics = (rawData.demographicsRows || []).map(row => {
      // row: ['age18-24', 'female', 12.5]
      const rawAgeGroup = row[0] || '';
      const ageGroup = rawAgeGroup.replace(/^age/, ''); // 'age18-24' -> '18-24'
      const gender = row[1] || 'unknown';
      const percentage = parseFloat(row[2] || 0);
      return { ageGroup, gender, percentage };
    });

    const geography = (rawData.geographyRows || []).map(row => {
      // row: ['VN', 1500]
      const countryCode = (row[0] || '').toUpperCase();
      const views = parseInt(row[1] || 0, 10);
      return { countryCode, views };
    });

    const trafficSources = (rawData.trafficSourceRows || []).map(row => {
      // row: ['SUGGESTED_VIDEO', 800, 2400]
      const sourceType = row[0] || 'UNKNOWN';
      const views = parseInt(row[1] || 0, 10);
      const minutesWatched = parseFloat(row[2] || 0);
      return { sourceType, views, minutesWatched };
    });

    return {
      demographicsJson: JSON.stringify(demographics),
      geographyJson: JSON.stringify(geography),
      trafficSourcesJson: JSON.stringify(trafficSources)
    };
  }
}

module.exports = YouTubeAudienceAdapter;
