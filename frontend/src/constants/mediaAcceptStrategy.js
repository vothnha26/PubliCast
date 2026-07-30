/**
 * Media Filter Type Constants (Single Source of Truth)
 * SOLID-compliant Strategy pattern for Media Upload and Accept Filter resolving.
 */

export const MEDIA_FILTER_TYPES = Object.freeze({
  ALL: 'all',
  IMAGE: 'image',
  VIDEO: 'video',
});

/**
 * Strategy Map for file extension accept strings for HTML file input element.
 */
export const MEDIA_ACCEPT_STRATEGY = Object.freeze({
  [MEDIA_FILTER_TYPES.VIDEO]: "video/*,.mp4,.mov,.avi,.mkv,.webm,.flv,.wmv,.m4v,.3gp,video/mp4,video/quicktime,video/x-msvideo,video/x-matroska,video/webm",
  [MEDIA_FILTER_TYPES.IMAGE]: "image/*,.jpg,.jpeg,.png,.gif,.webp,.bmp,.svg,.tif,.tiff,image/jpeg,image/png,image/gif,image/webp",
  [MEDIA_FILTER_TYPES.ALL]: "video/*,image/*,.mp4,.mov,.avi,.mkv,.webm,.flv,.wmv,.m4v,.3gp,.jpg,.jpeg,.png,.gif,.webp,.bmp,.svg,.tif,.tiff,video/mp4,video/quicktime,video/webm,image/jpeg,image/png",
});

/**
 * Strategy Map for UI prompt helper text in Dropzone.
 */
export const MEDIA_PROMPT_STRATEGY = Object.freeze({
  [MEDIA_FILTER_TYPES.VIDEO]: "Click to select or drag your video file(s) here (MP4, MOV, AVI, WebM, MKV...)",
  [MEDIA_FILTER_TYPES.IMAGE]: "Click to select or drag your image file(s) here (JPG, PNG, GIF, WebP...)",
  [MEDIA_FILTER_TYPES.ALL]: "Click to select or drag your image or video file(s) here.",
});

/**
 * Resolver function for accept string using Strategy Map (OCP & SRP compliant).
 */
export const resolveMediaAcceptString = (filterType = MEDIA_FILTER_TYPES.ALL) => {
  return MEDIA_ACCEPT_STRATEGY[filterType] || MEDIA_ACCEPT_STRATEGY[MEDIA_FILTER_TYPES.ALL];
};

/**
 * Resolver function for dropzone text using Strategy Map.
 */
export const resolveMediaPromptText = (filterType = MEDIA_FILTER_TYPES.ALL) => {
  return MEDIA_PROMPT_STRATEGY[filterType] || MEDIA_PROMPT_STRATEGY[MEDIA_FILTER_TYPES.ALL];
};
