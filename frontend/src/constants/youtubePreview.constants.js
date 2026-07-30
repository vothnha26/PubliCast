/**
 * Hằng số UI và nhãn văn bản cho YouTube Preview Card.
 * Tuân thủ tuyệt đối quy tắc "Không Magic Strings" và nguyên tắc SOLID.
 */

export const YOUTUBE_PREVIEW_DEFAULTS = {
  CHANNEL_NAME: "CodeChick",
  SUBSCRIBERS_COUNT_TEXT: "XX subscribers",
  VIEWS_AND_DATE_TEXT: "X views, Jul 30, 2026",
  DEFAULT_TITLE: "New YouTube Video",
  INITIAL_TIME_TEXT: "0:00 / 00:00",
  LIKE_COUNT_TEXT: "0",
  CHANNEL_INITIAL: "C"
};

export const YOUTUBE_PREVIEW_LABELS = {
  JOIN: "Join",
  SUBSCRIBE: "Subscribe",
  SHARE: "Share",
  DOWNLOAD: "Download",
  CLIP: "Clip",
  MORE: "...more",
  LIKE: "Like",
  DISLIKE: "Dislike",
  FOOTNOTE_MOBILE_NOTE: "Youtube Shorts and Youtube Video (mobile version) descriptions can not be displayed on previews but will be included in your post"
};

export const YOUTUBE_PREVIEW_DEVICES = {
  MOBILE: "mobile",
  DESKTOP: "desktop"
};

export const YOUTUBE_MEDIA_TYPES = {
  VIDEO: "video",
  SHORT: "short"
};
