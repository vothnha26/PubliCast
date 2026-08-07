const prisma = require('../../config/prisma');

/**
 * YouTubeVideoMetricRepository
 * SRP: append-only writes/reads for per-video YouTube insight fetches.
 */
class YouTubeVideoMetricRepository {
  async create(data, client = prisma) {
    return client.youTubeVideoMetric.create({ data });
  }

  async findRecentByVideo(socialAccountId, platformVideoId, limit = 30, client = prisma) {
    return client.youTubeVideoMetric.findMany({
      where: { socialAccountId, platformVideoId },
      orderBy: { fetchedAt: 'desc' },
      take: limit
    });
  }
}

module.exports = new YouTubeVideoMetricRepository();
