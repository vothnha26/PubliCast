/**
 * @file bluesky.constants.js
 * @description Hằng số dùng riêng cho module tích hợp Bluesky (AT Protocol).
 */

const BLUESKY_CONSTANTS = Object.freeze({
  DEFAULT_PDS_URL: 'https://bsky.social',
  RECORD_TYPES: {
    POST: 'app.bsky.feed.post',
    EMBED_IMAGES: 'app.bsky.embed.images',
    THREAD_VIEW_POST: 'app.bsky.feed.defs#threadViewPost'
  },
  LIMITS: {
    MAX_GRAPHEMES: 300,
    MAX_IMAGES: 4,
    MAX_IMAGE_SIZE_BYTES: 1 * 1024 * 1024 // 1MB
  }
});

module.exports = BLUESKY_CONSTANTS;
