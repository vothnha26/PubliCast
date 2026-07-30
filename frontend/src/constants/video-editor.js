export const VIDEO_EDITOR_TABS = Object.freeze({
  TRIM: 'trim',
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
  { id: 'default', backendPreset: 'none', name: 'Default', filterCss: 'none' },
  { id: 'chrome', backendPreset: 'chrome', name: 'Chrome', filterCss: 'contrast(125%) saturate(150%)' },
  { id: 'fade', backendPreset: 'fade', name: 'Fade', filterCss: 'contrast(90%) brightness(110%) saturate(85%)' },
  { id: 'cold', backendPreset: 'cold', name: 'Cold', filterCss: 'hue-rotate(180deg) saturate(120%)' },
  { id: 'warm', backendPreset: 'warm', name: 'Warm', filterCss: 'sepia(30%) saturate(120%) hue-rotate(15deg)' },
  { id: 'pastel', backendPreset: 'pastel', name: 'Pastel', filterCss: 'saturate(140%) brightness(115%)' },
  { id: 'mono', backendPreset: 'mono', name: 'Mono', filterCss: 'grayscale(100%) contrast(125%)' },
  { id: 'noir', backendPreset: 'noir', name: 'Noir', filterCss: 'grayscale(100%) contrast(180%)' },
  { id: 'stark', backendPreset: 'stark', name: 'Stark', filterCss: 'grayscale(100%) brightness(120%) contrast(140%)' },
  { id: 'wash', backendPreset: 'wash', name: 'Wash', filterCss: 'grayscale(80%) brightness(120%)' },
  { id: 'sepia', backendPreset: 'sepia', name: 'Sepia', filterCss: 'sepia(100%)' },
  { id: 'rust', backendPreset: 'rust', name: 'Rust', filterCss: 'sepia(75%) hue-rotate(345deg) saturate(150%)' },
  { id: 'blues', backendPreset: 'blues', name: 'Blues', filterCss: 'hue-rotate(200deg) saturate(130%)' }
]);

export const FINETUNE_FIELDS = Object.freeze([
  'brightness', 'contrast', 'saturation', 'exposure', 'temperature', 'gamma', 'clarity', 'vignette'
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
