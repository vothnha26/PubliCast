/**
 * PLATFORMS — Enum các nền tảng mạng xã hội được hỗ trợ.
 * Dùng thay thế mọi string literal 'youtube', 'facebook', 'tiktok'.
 */
export const PLATFORMS = {
  YOUTUBE: 'youtube',
  FACEBOOK: 'facebook',
  TIKTOK: 'tiktok',
  INSTAGRAM: 'instagram',
  TELEGRAM: 'telegram',
  THREADS: 'threads',
  BLUESKY: 'bluesky',
  REDDIT: 'reddit',
  TWITCH: 'twitch',
  // Media-source integration, not a publishable channel — has no publish
  // pipeline, post-creator preset, or channel dashboard. Kept here (matching
  // backend's PLATFORMS.GOOGLE_DRIVE) so callers can reference it instead of
  // the raw string, but it's intentionally absent from PLATFORM_LABELS/
  // PLATFORM_DEFAULT_TAB/PLATFORM_API_KEY above — those are all
  // publish-channel-only maps.
  GOOGLE_DRIVE: 'GOOGLE_DRIVE',
};

/** Tên hiển thị */
export const PLATFORM_LABELS = {
  [PLATFORMS.YOUTUBE]: 'YouTube',
  [PLATFORMS.FACEBOOK]: 'Facebook',
  [PLATFORMS.TIKTOK]: 'TikTok',
  [PLATFORMS.INSTAGRAM]: 'Instagram',
  [PLATFORMS.TELEGRAM]: 'Telegram',
  [PLATFORMS.THREADS]: 'Threads',
  [PLATFORMS.BLUESKY]: 'Bluesky',
  [PLATFORMS.REDDIT]: 'Reddit',
  [PLATFORMS.TWITCH]: 'Twitch',
};

/** Default tab khi vào Platform Dashboard */
export const PLATFORM_DEFAULT_TAB = {
  [PLATFORMS.YOUTUBE]: 'community',
  [PLATFORMS.FACEBOOK]: 'overview',
  [PLATFORMS.TIKTOK]: 'community',
  [PLATFORMS.INSTAGRAM]: 'community',
  [PLATFORMS.TELEGRAM]: 'overview',
  [PLATFORMS.THREADS]: 'community',
  [PLATFORMS.BLUESKY]: 'community',
  [PLATFORMS.REDDIT]: 'overview',
  [PLATFORMS.TWITCH]: 'overview',
};

/** Platform gửi lên backend (uppercase) */
export const PLATFORM_API_KEY = {
  [PLATFORMS.YOUTUBE]: 'YOUTUBE',
  [PLATFORMS.FACEBOOK]: 'FACEBOOK',
  [PLATFORMS.TIKTOK]: 'TIKTOK',
  [PLATFORMS.INSTAGRAM]: 'INSTAGRAM',
  [PLATFORMS.TELEGRAM]: 'TELEGRAM',
  [PLATFORMS.THREADS]: 'THREADS',
  [PLATFORMS.BLUESKY]: 'BLUESKY',
  [PLATFORMS.REDDIT]: 'REDDIT',
  [PLATFORMS.TWITCH]: 'TWITCH',
  X: 'TWITTER_X', // special case
};

/** Stock Providers & Types */
export const STOCK_PROVIDERS = {
  UNSPLASH: 'UNSPLASH',
  PEXELS: 'PEXELS',
};

export const STOCK_MEDIA_TYPES = {
  PHOTO: 'PHOTO',
  VIDEO: 'VIDEO',
};

/** Platform mặc định khi tạo bài */
export const DEFAULT_PLATFORM = PLATFORMS.YOUTUBE;
