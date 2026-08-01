import { PLATFORMS } from '../constants/platforms';
import { PLATFORM_CONFIGS } from '../constants/platformRegistry';

/**
 * Helper to count graphemes accurately using Intl.Segmenter with fallback.
 * Critical for platforms like Bluesky that enforce a 300 grapheme limit.
 */
export function getGraphemeCount(text) {
  if (!text) return 0;
  if (typeof Intl !== 'undefined' && Intl.Segmenter) {
    const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' });
    return [...segmenter.segment(text)].length;
  }
  return Array.from(text).length;
}

/**
 * validatePostPayload
 * Standardized helper for Module 3 validation rules.
 *
 * @param {string} platformKey - Platform key e.g. 'twitch', 'reddit', 'bluesky', 'facebook', 'youtube', 'tiktok'
 * @param {object} payload - Post form payload
 * @returns {{ isValid: boolean, errors: Array<{ field: string, message: string }> }}
 */
export function validatePostPayload(platformKey, payload = {}) {
  const errors = [];
  if (!platformKey) {
    return { isValid: true, errors: [] };
  }

  const platLower = platformKey.toLowerCase();
  const platUpper = platformKey.toUpperCase();

  const title = (payload.title || '').trim();
  const caption = payload.caption || '';
  const media = payload.media || payload.postMedia || [];
  const images = payload.images || [];
  const video = payload.video || null;
  const hasMedia = payload.hasMedia || media.length > 0 || images.length > 0 || !!video || !!payload.uploadedVideoPath;
  const mediaCount = payload.mediaCount || media.length || images.length + (video ? 1 : 0);
  const targetSubreddit = payload.subreddit || payload.extraConfig?.subreddit || '';

  // 1. TWITCH VALIDATION RULES
  if (platLower === 'twitch') {
    if (hasMedia) {
      errors.push({
        field: 'media',
        message: 'Twitch does not support media attachments for scheduled posts.'
      });
    }
    if (title && title.length > 140) {
      errors.push({
        field: 'title',
        message: `Stream title must be 140 characters or less. (Current: ${title.length})`
      });
    }
    if (caption && caption.length > 500) {
      errors.push({
        field: 'caption',
        message: `Chat message must be 500 characters or less. (Current: ${caption.length})`
      });
    }
  }

  // 2. REDDIT VALIDATION RULES
  if (platLower === 'reddit') {
    if (!title && !caption) {
      errors.push({
        field: 'title',
        message: 'Reddit post requires a title (max 300 characters).'
      });
    } else if (title && title.length > 300) {
      errors.push({
        field: 'title',
        message: `Reddit post title cannot exceed 300 characters. (Current: ${title.length})`
      });
    }
    if (caption && caption.length > 40000) {
      errors.push({
        field: 'caption',
        message: `Reddit body text cannot exceed 40,000 characters. (Current: ${caption.length})`
      });
    }
    if (!targetSubreddit) {
      errors.push({
        field: 'subreddit',
        message: 'Reddit post requires a target Subreddit.'
      });
    }
  }

  // 3. BLUESKY VALIDATION RULES
  if (platLower === 'bluesky') {
    const graphemes = getGraphemeCount(caption);
    if (graphemes > 300) {
      errors.push({
        field: 'caption',
        message: `Bluesky post exceeds 300 graphemes. (Current: ${graphemes})`
      });
    }
    if (mediaCount > 4) {
      errors.push({
        field: 'media',
        message: `Bluesky posts allow a maximum of 4 images. (Current: ${mediaCount})`
      });
    }
  }

  // 4. GENERAL REGISTRY RULES FALLBACK
  const config = PLATFORM_CONFIGS[platLower] || PLATFORM_CONFIGS[platUpper];
  if (config && config.validationRules) {
    const checkContext = {
      hasMedia,
      isVideo: payload.isVideo || false,
      videoDuration: payload.videoDuration || 0,
      videoWidth: payload.videoWidth || 0,
      videoHeight: payload.videoHeight || 0,
      mediaCount,
      caption,
      title
    };

    const alwaysRules = config.validationRules._always || [];
    for (const rule of alwaysRules) {
      if (rule.check && rule.check(checkContext)) {
        const msg = rule.message ? rule.message(checkContext) : 'Validation failed';
        if (!errors.some(e => e.message === msg)) {
          errors.push({ field: 'general', message: msg });
        }
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}
