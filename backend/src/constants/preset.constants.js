/**
 * Centralized Preset Constants (No Magic Strings)
 */
const PRESET_KEYS = Object.freeze({
  GLOBAL: 'global',
  FACEBOOK: 'facebook',
  INSTAGRAM: 'instagram',
  YOUTUBE: 'youtube',
  TIKTOK: 'tiktok',
  THREADS: 'threads'
});

const FACEBOOK_CONTENT_TYPES = Object.freeze({
  POST: 'post',
  REEL: 'reel',
  STORY: 'story',
  ALBUM: 'album'
});

const INSTAGRAM_CONTENT_TYPES = Object.freeze({
  POST: 'post',
  REEL: 'reel',
  STORY: 'story'
});

const YOUTUBE_VIDEO_TYPES = Object.freeze({
  VIDEO: 'video',
  SHORT: 'short'
});

const YOUTUBE_PRIVACY_LEVELS = Object.freeze({
  PUBLIC: 'public',
  UNLISTED: 'unlisted',
  PRIVATE: 'private'
});

const TIKTOK_PRIVACY_LEVELS = Object.freeze({
  PUBLIC: 'public',
  FRIENDS: 'friends',
  SELF: 'self',
  // Canonical backend aliases for API compatibility
  PUBLIC_TO_EVERYONE: 'public',
  MUTUAL_FOLLOW_FRIENDS: 'friends',
  SELF_ONLY: 'self'
});

const THREADS_WHO_CAN_REPLY = Object.freeze({
  EVERYONE: 'everyone',
  ACCOUNTS_YOU_FOLLOW: 'accounts_you_follow',
  MENTIONED_ONLY: 'mentioned_only'
});

module.exports = {
  PRESET_KEYS,
  FACEBOOK_CONTENT_TYPES,
  INSTAGRAM_CONTENT_TYPES,
  YOUTUBE_VIDEO_TYPES,
  YOUTUBE_PRIVACY_LEVELS,
  TIKTOK_PRIVACY_LEVELS,
  THREADS_WHO_CAN_REPLY
};
