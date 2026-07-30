export const VIDEO_EDITOR_TABS = Object.freeze({
  TRIM: 'trim',
  AUDIO: 'audio',
  TEXT: 'text',
  SUBTITLES: 'subtitles',
  FILTER: 'filter',
  FINETUNE: 'finetune',
  RESIZE: 'resize'
});

export const ASPECT_RATIOS = Object.freeze({
  ORIGINAL: 'original',
  PORTRAIT: '9:16',
  LANDSCAPE: '16:9',
  SQUARE: '1:1'
});

export const FILTER_PRESETS = Object.freeze([
  { id: 'default', backendPreset: 'none', name: 'Gốc', class: 'filter-none' },
  { id: 'mono', backendPreset: 'grayscale', name: 'Đen trắng', class: 'grayscale contrast-125' },
  { id: 'sepia', backendPreset: 'sepia', name: 'Sepia', class: 'sepia' },
  { id: 'rust', backendPreset: 'vintage', name: 'Vintage', class: 'sepia-75 hue-rotate-345 saturate-150' },
  { id: 'warm', backendPreset: 'warm', name: 'Ấm áp', class: 'sepia-30 saturate-120 hue-rotate-15' },
  { id: 'cold', backendPreset: 'cool', name: 'Tươi mát', class: 'hue-rotate-180 saturate-120' },
  { id: 'chrome', backendPreset: 'dramatic', name: 'Nổi bật', class: 'contrast-125 saturate-150' }
]);

export const FINETUNE_FIELDS = Object.freeze(['brightness', 'contrast', 'saturation']);

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
