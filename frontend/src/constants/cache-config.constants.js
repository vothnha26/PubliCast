/**
 * Centralized Cache Configuration Constants.
 * Prevents magic numbers and supports clean custom configuration per feature area.
 */
export const CACHE_CONFIG = Object.freeze({
  DEFAULT_STALE_TIME_MS: 60 * 1000,       // 60 seconds
  DEFAULT_GC_TIME_MS: 5 * 60 * 1000,      // 5 minutes
  DEFAULT_RETRY_COUNT: 1,

  // Feature Specific Timeouts (Flexible & Easy to Extend)
  METRICS_STALE_TIME_MS: 60 * 1000,       // 1 minute
  INBOX_STALE_TIME_MS: 30 * 1000,         // 30 seconds
  SETTINGS_STALE_TIME_MS: 10 * 60 * 1000  // 10 minutes
});
