const prisma = require('../../config/prisma');
const logger = require('../../utils/logger');
const { QUEUE_CONFIG } = require('../../constants/video-publish.constants');

class FeedScanHandler {
  async handle(job, feedQueue) {
    const feedSources = await prisma.feedSource.findMany({ select: { id: true } });

    if (feedSources.length === 0) {
      logger.debug('[FeedScanHandler] No feed sources to refresh.');
      return { enqueued: 0 };
    }

    await feedQueue.addBulk(
      feedSources.map((source) => ({
        name: QUEUE_CONFIG.FEED.JOB_REFRESH,
        data: { feedSourceId: source.id },
        opts: { jobId: `${QUEUE_CONFIG.FEED.JOB_REFRESH}:${source.id}:${job.id}` }
      }))
    );

    logger.debug(`[FeedScanHandler] Enqueued ${feedSources.length} feed-source refresh job(s).`);
    return { enqueued: feedSources.length };
  }
}

module.exports = new FeedScanHandler();
