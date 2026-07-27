const SEED_STATUS = Object.freeze({
  NOT_STARTED: 'NOT_STARTED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED'
});

/**
 * Static Redis key names (no params). Kept separate from REDIS_KEY_BUILDERS
 * so a factory function can never be used as a key by mistake.
 */
const REDIS_KEYS = Object.freeze({
  SEED_CHECK_LOCK: 'lock:post-analytics-seed-check',
  SEED_STATUS: 'sync_post_analytics_seed_status',
  SEED_STARTED_AT: 'sync_post_analytics_seed_started_at'
});

/**
 * Redis key factory functions (require a param). Kept separate from
 * REDIS_KEYS so calling REDIS_KEYS.coldStartLock without invoking it
 * can't silently produce a stringified-function Redis key at runtime.
 */
const REDIS_KEY_BUILDERS = Object.freeze({
  coldStartLock: (platformPostId) => `lock:cold-start:${platformPostId}`,
  backfillLock: (platformPostId) => `lock:post-backfill:${platformPostId}`
});

const LOCK_TTL = Object.freeze({
  SEED_CHECK: 60,
  SEED_STATUS_INPROGRESS: 24 * 60 * 60,
  SEED_WATCHDOG_TIMEOUT: 2 * 60 * 60,
  COLD_START: 30,
  BACKFILL: 10 * 60
});

const YOUTUBE_QUOTA_THRESHOLD = 1500;
// YouTube Data/Analytics API's default daily quota cap (units/day). Named
// here so the raw-usage guard in youtube-analytics.service.js and the
// percentage-based guards in social.worker.js/sync-post-analytics.service.js
// stay derived from the same number instead of each hardcoding 10000 (#67).
const YOUTUBE_DAILY_QUOTA_LIMIT = 10000;

/**
 * Matches the existing Prisma `PlatformType` enum values (uppercase),
 * NOT the frontend's lowercase `constants/platforms.js` PLATFORMS values.
 */
const PLATFORM = Object.freeze({
  FACEBOOK: 'FACEBOOK',
  YOUTUBE: 'YOUTUBE',
  TIKTOK: 'TIKTOK'
});

/**
 * Capability map keyed by PLATFORM.* so branching never checks platform
 * name strings directly (OCP: add a platform by adding one entry here).
 */
const PLATFORM_CAPABILITIES = Object.freeze({
  [PLATFORM.FACEBOOK]: { supportsHistoricalBackfill: false },
  [PLATFORM.TIKTOK]: { supportsHistoricalBackfill: false },
  [PLATFORM.YOUTUBE]: { supportsHistoricalBackfill: true }
});

module.exports = {
  SEED_STATUS,
  REDIS_KEYS,
  REDIS_KEY_BUILDERS,
  LOCK_TTL,
  YOUTUBE_QUOTA_THRESHOLD,
  YOUTUBE_DAILY_QUOTA_LIMIT,
  PLATFORM,
  PLATFORM_CAPABILITIES
};
