/**
 * Video Editor & FFmpeg Filter Constants
 * Single source of truth for aspect ratios, filter presets, adjustment ranges, and FFmpeg defaults.
 * Prevents magic strings across all video processing modules.
 */

const ASPECT_RATIOS = Object.freeze({
  ORIGINAL: 'original',
  SQUARE_1_1: '1:1',
  VERTICAL_9_16: '9:16',
  LANDSCAPE_16_9: '16:9'
});

const FILTER_PRESETS = Object.freeze({
  NONE:    'none',
  // Color Group
  CHROME:  'chrome',
  FADE:    'fade',
  COLD:    'cold',
  WARM:    'warm',
  PASTEL:  'pastel',
  // Mono Group
  MONO:    'mono',
  NOIR:    'noir',
  STARK:   'stark',
  WASH:    'wash',
  // Tone Group
  SEPIA:   'sepia',
  RUST:    'rust',
  BLUES:   'blues'
});

const ADJUSTMENT_LIMITS = Object.freeze({
  MIN_PERCENT: -100,
  MAX_PERCENT: 100,
  DEFAULT_PERCENT: 0,
  FFMPEG_BRIGHTNESS_MIN: -1.0,
  FFMPEG_BRIGHTNESS_MAX: 1.0,
  FFMPEG_CONTRAST_MIN: 0.0,
  FFMPEG_CONTRAST_MAX: 2.0,
  FFMPEG_SATURATION_MIN: 0.0,
  FFMPEG_SATURATION_MAX: 3.0
});

const FFMPEG_DEFAULTS = Object.freeze({
  PRESET: 'superfast',
  CRF: '20',
  VIDEO_CODEC: 'libx264',
  AUDIO_CODEC: 'aac',
  STRICT: 'experimental',
  DEFAULT_FONT_SIZE: 24,
  DEFAULT_FONT_COLOR: 'white',
  DEFAULT_AUDIO_VOLUME: 50,
  DEFAULT_CROP_X: '0.5000',
  SUBTITLE_Y_OFFSET: 80,
  SUBTITLE_FONT_SIZE: 22,
  SUBTITLE_BOX_BORDER: 6
});

const VIDEO_FILE_CONFIG = Object.freeze({
  TEMP_DIR: 'temp',
  MEDIA_DIR: 'media',
  DEFAULT_BRAND_ID: 'unassigned',
  OUTPUT_PREFIX: 'edited'
});

const TRANSFORM_DEFAULTS = Object.freeze({
  ROTATION_NONE: 0,
  SCALE_NONE: 100,
  FLIP_NONE: false,
  // Official FFmpeg transpose filter options:
  // 0 = 90° CCW + Vertical Flip, 1 = 90° Clockwise, 2 = 90° Counter-Clockwise, 3 = 90° Clockwise + Vertical Flip
  TRANSPOSE_90CW: '1',
  TRANSPOSE_90CCW: '2',
  HFLIP: 'hflip',
  VFLIP: 'vflip'
});

module.exports = {
  ASPECT_RATIOS,
  FILTER_PRESETS,
  ADJUSTMENT_LIMITS,
  FFMPEG_DEFAULTS,
  VIDEO_FILE_CONFIG,
  TRANSFORM_DEFAULTS
};
