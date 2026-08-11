const feedService = require('../../services/workspace/feed.service');
const logger = require('../../utils/logger');

class FeedRefreshHandler {
  async handle(job) {
    const { feedSourceId } = job.data;
    try {
      const result = await feedService.refreshFeedSource(feedSourceId);
      logger.debug(`[FeedRefreshHandler] Feed source ${feedSourceId}: +${result.added} entr${result.added === 1 ? 'y' : 'ies'}.`);
      return result;
    } catch (err) {
      logger.warn(`[FeedRefreshHandler] Refresh failed for feed source ${feedSourceId}: ${err.message}`);
      throw err; // let BullMQ retry/backoff handle it
    }
  }
}

module.exports = new FeedRefreshHandler();
