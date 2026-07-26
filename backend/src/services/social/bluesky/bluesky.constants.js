/**
 * @file bluesky.constants.js
 * @description Hằng số dùng riêng cho module tích hợp Bluesky (AT Protocol).
 */

const BLUESKY_CONSTANTS = Object.freeze({
  DEFAULT_PDS_URL: 'https://bsky.social',
  VIDEO_SERVICE_URL: 'https://video.bsky.app',
  VIDEO_UPLOAD_LXM: 'com.atproto.repo.uploadBlob',
  RECORD_TYPES: {
    POST: 'app.bsky.feed.post',
    EMBED_IMAGES: 'app.bsky.embed.images',
    EMBED_VIDEO: 'app.bsky.embed.video',
    THREAD_VIEW_POST: 'app.bsky.feed.defs#threadViewPost'
  },
  LIMITS: {
    MAX_GRAPHEMES: 300,
    MAX_IMAGES: 4,
    MAX_IMAGE_SIZE_BYTES: 1 * 1024 * 1024, // 1MB
    MAX_VIDEO_SIZE_BYTES: 50 * 1024 * 1024, // 50MB
    VIDEO_JOB_POLL_INTERVAL_MS: 2000,
    VIDEO_JOB_MAX_ATTEMPTS: 30,
    VIDEO_SERVICE_TOKEN_EXPIRY_SEC: 1800 // 30 mins
  }
});

module.exports = BLUESKY_CONSTANTS;
