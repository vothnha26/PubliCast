const { Worker } = require('bullmq');
const { defaultConnection } = require('../config/bullmq');
const { feedQueue, FEED_QUEUE_NAME } = require('./feed.queue');
const feedScanHandler = require('./handlers/feed-scan.handler');
const feedRefreshHandler = require('./handlers/feed-refresh.handler');
const { QUEUE_CONFIG } = require('../constants/video-publish.constants');
const logger = require('../utils/logger');

/**
 * BullMQ Worker for periodic RSS feed refresh. Replaces the old node-cron
 * scheduler (feed-scheduler.service.js), which ran every FeedSource fetch
 * sequentially in-process on the API server's event loop. Here the SCAN job
 * fans out one REFRESH job per FeedSource, so fetches run on the worker
 * (independently scalable from the API process) with per-source retry/backoff
 * instead of one big all-or-nothing pass.
 */
const feedWorker = new Worker(FEED_QUEUE_NAME, async (job) => {
  if (job.name === QUEUE_CONFIG.FEED.JOB_SCAN) {
    return await feedScanHandler.handle(job, feedQueue);
  }
  if (job.name === QUEUE_CONFIG.FEED.JOB_REFRESH) {
    return await feedRefreshHandler.handle(job);
  }
  throw new Error(`Unhandled job type: ${job.name} in Feed Worker`);
}, {
  ...defaultConnection,
  concurrency: QUEUE_CONFIG.FEED.CONCURRENCY,
  drainDelay: 300
});

feedWorker.on('completed', (job) => {
  logger.debug(`[Feed Worker] Job ${job.id} (${job.name}) completed.`);
});

feedWorker.on('failed', (job, err) => {
  logger.warn(`[Feed Worker] Job ${job?.id} (${job?.name}) failed: ${err.message}`);
});

module.exports = feedWorker;
