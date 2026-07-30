const BaseFilterStrategy = require('./base-filter.strategy');
const { ADJUSTMENT_LIMITS } = require('../../../../constants/video-editor.constants');

/**
 * Strategy for video color adjustments using FFmpeg filter chain.
 *
 * Supported parameters (all on -100..100 scale from FE):
 *   brightness   → eq brightness   (-1.0 to 1.0)
 *   contrast     → eq contrast     (0.0 to 2.0)
 *   saturation   → eq saturation   (0.0 to 3.0)
 *   exposure     → eq brightness   (maps additively, range ±0.5)
 *   gamma        → eq gamma        (0.1 to 5.0, default 1.0)
 *   temperature  → colorbalance    (rs/bs shift to simulate warm/cool)
 *   vignette     → vignette filter (angle based on vignette value)
 *   clarity      → unsharp filter  (sharpening luma for positive clarity)
 */
class AdjustmentFilterStrategy extends BaseFilterStrategy {
  appliesTo(options) {
    const { adjustments } = options || {};
    if (!adjustments || typeof adjustments !== 'object') return false;

    const {
      brightness, contrast, saturation,
      exposure, gamma, temperature, vignette, clarity
    } = adjustments;

    return (
      (brightness  !== undefined && brightness  !== 0) ||
      (contrast    !== undefined && contrast    !== 0) ||
      (saturation  !== undefined && saturation  !== 0) ||
      (exposure    !== undefined && exposure    !== 0) ||
      (gamma       !== undefined && gamma       !== 0) ||
      (temperature !== undefined && temperature !== 0) ||
      (vignette    !== undefined && vignette    !== 0) ||
      (clarity     !== undefined && clarity     !== 0)
    );
  }

  buildFilter(options) {
    const { adjustments } = options;
    const {
      brightness  = 0,
      contrast    = 0,
      saturation  = 0,
      exposure    = 0,
      gamma       = 0,
      temperature = 0,
      vignette    = 0,
      clarity     = 0
    } = adjustments;

    const filters = [];

    // --- eq filter: brightness / contrast / saturation / exposure / gamma ---
    const combinedBrightness = brightness / 100 + exposure / 200;
    const bVal = Math.min(
      ADJUSTMENT_LIMITS.FFMPEG_BRIGHTNESS_MAX,
      Math.max(ADJUSTMENT_LIMITS.FFMPEG_BRIGHTNESS_MIN, combinedBrightness)
    ).toFixed(2);

    const cVal = Math.min(
      ADJUSTMENT_LIMITS.FFMPEG_CONTRAST_MAX,
      Math.max(ADJUSTMENT_LIMITS.FFMPEG_CONTRAST_MIN, 1.0 + contrast / 100)
    ).toFixed(2);

    const sVal = Math.min(
      ADJUSTMENT_LIMITS.FFMPEG_SATURATION_MAX,
      Math.max(ADJUSTMENT_LIMITS.FFMPEG_SATURATION_MIN, 1.0 + saturation / 100)
    ).toFixed(2);

    // Gamma: map -100..100 → 0.2..3.0 (default 1.0)
    const gVal = Math.min(3.0, Math.max(0.2, 1.0 + gamma / 100)).toFixed(2);

    const hasEqParams = (
      brightness !== 0 || contrast !== 0 || saturation !== 0 || exposure !== 0 || gamma !== 0
    );
    if (hasEqParams) {
      filters.push(`eq=brightness=${bVal}:contrast=${cVal}:saturation=${sVal}:gamma=${gVal}`);
    }

    // --- colorbalance: temperature (warm = push red+; cool = push blue+) ---
    if (temperature !== 0) {
      const tCoef = (temperature / 100 * 0.3).toFixed(3);
      filters.push(`colorbalance=rs=${tCoef}:gs=0:bs=${(-tCoef)}:rm=0:gm=0:bm=0:rh=0:gh=0:bh=0`);
    }

    // --- vignette filter ---
    if (vignette !== 0) {
      const angle = (Math.abs(vignette) / 100 * (Math.PI / 4)).toFixed(4);
      filters.push(`vignette=angle=${angle}`);
    }

    // --- clarity filter (unsharp for sharpening / boxblur for softening) ---
    if (clarity > 0) {
      const lumaAmount = (clarity / 100 * 2.0).toFixed(2);
      filters.push(`unsharp=luma_msize_x=5:luma_msize_y=5:luma_amount=${lumaAmount}`);
    } else if (clarity < 0) {
      const blurRadius = Math.min(5, Math.max(1, Math.round(Math.abs(clarity) / 25)));
      filters.push(`boxblur=${blurRadius}:${blurRadius}`);
    }

    return filters;
  }
}

module.exports = AdjustmentFilterStrategy;
