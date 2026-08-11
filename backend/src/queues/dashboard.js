const { createBullBoard } = require('@bull-board/api');
const { BullMQAdapter } = require('@bull-board/api/bullMQAdapter');
const { ExpressAdapter } = require('@bull-board/express');
const { videoQueue } = require('./video.queue');
const { feedQueue } = require('./feed.queue');

/**
 * Setup Bull Board Dashboard
 * Allows visual monitoring of BullMQ jobs. Publishing moved to QStash (see
 * routes/webhooks/qstash.routes.js) — its message/DLQ state is visible in
 * the Upstash Console instead of here. Video and feed-refresh (both still
 * BullMQ) remain.
 */
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

const boardQueues = process.env.NODE_ENV !== 'test'
  ? [new BullMQAdapter(videoQueue), new BullMQAdapter(feedQueue)]
  : [];

createBullBoard({
  queues: boardQueues,
  serverAdapter: serverAdapter,
});

module.exports = serverAdapter;
