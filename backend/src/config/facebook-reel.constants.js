/**
   * Cấu hình và Hằng số cho Facebook Reels
   */
  // Duration/resolution/frameRate limits live in shared/facebook-limits.json
  // so backend validation and frontend validation (platformValidation.constants.js)
  // read the same numbers instead of two hand-maintained copies drifting
  // apart (the Story max-duration mismatch — frontend hardcoded 15s,
  // Meta's actual limit is 60s — is exactly the kind of bug this prevents).
  const sharedLimits = require('../../../shared/facebook-limits.json');

  module.exports = {
    LIMITS: {
      MAX_REELS_PER_24H: 30,
      MAX_COLLABORATOR_INVITES_PER_24H: 10,
      MIN_DURATION_SECONDS: sharedLimits.REEL.MIN_DURATION_SECONDS,
      MAX_DURATION_SECONDS: sharedLimits.REEL.MAX_DURATION_SECONDS,
      MIN_RESOLUTION_WIDTH: sharedLimits.REEL.MIN_RESOLUTION_WIDTH,
      MIN_RESOLUTION_HEIGHT: sharedLimits.REEL.MIN_RESOLUTION_HEIGHT,
      ALLOWED_ASPECT_RATIO: '9:16',
      MAX_THUMBNAIL_SIZE_BYTES: 10 * 1024 * 1024, // 10MB
    },
    STORY_LIMITS: {
      MIN_DURATION_SECONDS: sharedLimits.STORY.MIN_DURATION_SECONDS,
      MAX_DURATION_SECONDS: sharedLimits.STORY.MAX_DURATION_SECONDS,
      MIN_RESOLUTION_WIDTH: sharedLimits.STORY.MIN_RESOLUTION_WIDTH,
      MIN_RESOLUTION_HEIGHT: sharedLimits.STORY.MIN_RESOLUTION_HEIGHT,
      MIN_FRAME_RATE: sharedLimits.STORY.MIN_FRAME_RATE,
      MAX_FRAME_RATE: sharedLimits.STORY.MAX_FRAME_RATE,
    },
    ERROR_CODES: {
      RATE_LIMIT: [4, 17, 32], // 4: User request limit, 17: Api limit, 32: Page request limit
      INVALID_ASPECT_RATIO: 1363040,
      INVALID_RESOLUTION: 1363127,
      INVALID_DURATION: 1363128,
      INVALID_FRAME_RATE: 1363129,
    },
    DEFAULT_RETRY_AFTER_SECONDS: 60,
    VIDEO_STATUS_POLL_INTERVAL_MS: 3000,
    VIDEO_STATUS_MAX_ATTEMPTS: 30,
  };
