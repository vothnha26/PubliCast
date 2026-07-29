const BaseFilterStrategy = require('./base-filter.strategy');
const { ADJUSTMENT_LIMITS } = require('../../../../constants/video-editor.constants');

/**
 * Strategy for Brightness, Contrast, and Saturation adjustments using FFmpeg `eq` filter
 */
class AdjustmentFilterStrategy extends BaseFilterStrategy {
  appliesTo(options) {
    const { adjustments } = options || {};
    if (!adjustments || typeof adjustments !== 'object') return false;
    
    const { brightness, contrast, saturation } = adjustments;
    return (
      (brightness !== undefined && brightness !== 0) ||
      (contrast !== undefined && contrast !== 0) ||
      (saturation !== undefined && saturation !== 0)
    );
  }

  buildFilter(options) {
    const { adjustments } = options;
    const { brightness = 0, contrast = 0, saturation = 0 } = adjustments;

    // Convert -100..100 UI percentage values to FFmpeg `eq` filter ranges
    // brightness: -1.0 to 1.0
    const bVal = Math.min(
      ADJUSTMENT_LIMITS.FFMPEG_BRIGHTNESS_MAX,
      Math.max(ADJUSTMENT_LIMITS.FFMPEG_BRIGHTNESS_MIN, brightness / 100)
    ).toFixed(2);

    // contrast: 0.0 to 2.0
    const cVal = Math.min(
      ADJUSTMENT_LIMITS.FFMPEG_CONTRAST_MAX,
      Math.max(ADJUSTMENT_LIMITS.FFMPEG_CONTRAST_MIN, 1.0 + contrast / 100)
    ).toFixed(2);

    // saturation: 0.0 to 3.0
    const sVal = Math.min(
      ADJUSTMENT_LIMITS.FFMPEG_SATURATION_MAX,
      Math.max(ADJUSTMENT_LIMITS.FFMPEG_SATURATION_MIN, 1.0 + saturation / 100)
    ).toFixed(2);

    return [`eq=brightness=${bVal}:contrast=${cVal}:saturation=${sVal}`];
  }
}

module.exports = AdjustmentFilterStrategy;
