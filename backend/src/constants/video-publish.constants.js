const TASK_STATUS = Object.freeze({
  PROCESSING: 'PROCESSING',
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED'
});

const REDIS_PREFIXES = Object.freeze({
  LOCK_VIDEO_TRIM: 'lock:video_trim:',
  TASK_VIDEO_TRIM: 'task:video_trim:'
});

const QUEUE_CONFIG = Object.freeze({
  VIDEO: {
    NAME: 'video-processor-queue',
    JOB_TRIM: 'process-video'
  },
  PUBLISH: {
    NAME: 'social-publish-queue',
    JOB_PUBLISH: 'publish-post',
    // Nguồn sự thật duy nhất cho "số lần thử tối đa" — dùng cho cả BullMQ
    // defaultJobOptions.attempts (publish.queue.js) lẫn giới hạn partial-retry
    // (update-db.step.js), tránh 2 con số độc lập dễ lệch nhau khi sửa.
    MAX_PUBLISH_ATTEMPTS: 3,
    // Đủ lớn để bao trùm timeout dài nhất của bất kỳ platform gateway nào
    // (Facebook hiện là 45s cho request có body) cộng buffer an toàn cho video
    // nặng — tránh BullMQ coi job publish còn đang chạy hợp lệ là "stalled" và
    // giao lại cho worker khác trong khi job cũ vẫn publish dở (rủi ro đăng trùng).
    LOCK_DURATION_MS: 120000
  },
  // Sweeps posts stuck at RETRYING whose self-enqueued partial-retry job got
  // lost (Redis restart, or a #106 active-job dedup skip) — #107 I7.
  RECONCILER: {
    // Must be well past LOCK_DURATION_MS + backoff, so a post that's still
    // legitimately mid-retry never gets swept as "stuck".
    STALE_RETRYING_MS: 10 * 60 * 1000,
    POLL_INTERVAL_MS: 5 * 60 * 1000,
    BATCH_SIZE: 50
  },
  // Moved off node-cron (was running RSS fetches for every FeedSource
  // sequentially in-process on the API server's event loop) onto BullMQ so
  // each source is its own retryable job and the fetch work runs on the
  // worker, not the request-serving process.
  FEED: {
    NAME: 'feed-refresh-queue',
    JOB_SCAN: 'scan-feed-sources',
    JOB_REFRESH: 'refresh-feed-source',
    SCHEDULER_ID: 'feed-refresh-scan',
    // RSS feeds don't need near-real-time freshness — hourly halves the
    // fetch volume of the old 30-minute node-cron cadence.
    CRON: '0 * * * *',
    MAX_ATTEMPTS: 3,
    // Caps how many per-source jobs run at once so a burst of scheduled
    // fetches can't hammer the network/DB at the same moment.
    CONCURRENCY: 5
  }
});

const SOCKET_EVENTS = Object.freeze({
  VIDEO_SUCCESS: 'video_processed_success',
  VIDEO_FAILED: 'video_processed_failed'
});

module.exports = {
  TASK_STATUS,
  REDIS_PREFIXES,
  QUEUE_CONFIG,
  SOCKET_EVENTS
};
