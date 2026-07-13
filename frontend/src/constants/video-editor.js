export const VIDEO_EDITOR_TABS = Object.freeze({
  TRIM: 'trim',
  AUDIO: 'audio',
  TEXT: 'text',
  SUBTITLES: 'subtitles'
});

export const ASPECT_RATIOS = Object.freeze({
  ORIGINAL: 'original',
  PORTRAIT: '9:16',
  LANDSCAPE: '16:9',
  SQUARE: '1:1'
});

export const MOOD_PRESETS = Object.freeze([
  { id: 'upbeat', label: 'Upbeat' },
  { id: 'chill', label: 'Chill' },
  { id: 'corporate', label: 'Corporate' },
  { id: 'epic', label: 'Epic' }
]);

export const VIDEO_SOCKET_EVENTS = Object.freeze({
  SUCCESS: 'video_processed_success',
  FAILED: 'video_processed_failed'
});

export const VIDEO_API_ROUTES = Object.freeze({
  TRIM: '/posts/trim',
  STATUS: (taskId) => `/posts/trim/${taskId}/status`,
  TRANSCRIBE: '/posts/transcribe',
  MUSIC: '/posts/music'
});
