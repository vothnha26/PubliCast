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
    JOB_PUBLISH: 'publish-post'
  },
  SOCIAL: {
    NAME: 'social-sync-queue',
    JOB_SYNC: 'sync-channel-metrics'
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
