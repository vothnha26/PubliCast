const BaseFilterStrategy = require('./base-filter.strategy');
const { TRANSFORM_DEFAULTS } = require('../../../../constants/video-editor.constants');

/**
 * Strategy for applying Rotation, Scale, and Flip transforms to a video.
 *
 * FFmpeg mapping:
 *   - Rotation 90°  → transpose=1   (rotate 90° clockwise)
 *   - Rotation -90° → transpose=2   (rotate 90° counter-clockwise)
 *   - Rotation 180° → transpose=1,transpose=1 (two CW 90° rotations)
 *   - Arbitrary °   → rotate=angle_in_radians (for non-90° steps)
 *   - flipH (horizontal flip) → hflip
 *   - flipV (vertical flip)   → vflip
 *   - scaleVal (percentage)   → scale=iw*(val/100):ih*(val/100)
 *
 * Transform order: scale → rotate/flip (to avoid distortions)
 */
class RotationTransformStrategy extends BaseFilterStrategy {
  appliesTo(options) {
    const { rotation = 0, scaleVal = 100, flipH = false, flipV = false } = options || {};
    return (
      rotation !== TRANSFORM_DEFAULTS.ROTATION_NONE ||
      scaleVal !== TRANSFORM_DEFAULTS.SCALE_NONE ||
      flipH !== TRANSFORM_DEFAULTS.FLIP_NONE ||
      flipV !== TRANSFORM_DEFAULTS.FLIP_NONE
    );
  }

  buildFilter(options) {
    const {
      rotation = 0,
      scaleVal = 100,
      flipH = false,
      flipV = false
    } = options;

    const filters = [];

    // 1. Scale (if not 100%)
    if (scaleVal !== 100 && scaleVal > 0) {
      const factor = (scaleVal / 100).toFixed(4);
      filters.push(`scale=iw*${factor}:ih*${factor}`);
    }

    // 2. Rotation via transpose (snap to 90° steps) or rotate filter (arbitrary)
    const normalizedRotation = ((rotation % 360) + 360) % 360; // normalize to 0-359
    if (normalizedRotation === 90) {
      filters.push('transpose=1');  // 90° CW
    } else if (normalizedRotation === 180) {
      filters.push('transpose=1,transpose=1');  // 180°
    } else if (normalizedRotation === 270) {
      filters.push('transpose=2');  // 90° CCW (= 270° CW)
    } else if (normalizedRotation !== 0) {
      // Arbitrary angle using FFmpeg rotate filter (in radians)
      const radians = (normalizedRotation * Math.PI / 180).toFixed(6);
      // 'ow=hypot(iw,ih)' & 'oh=ow' makes the frame large enough to contain the rotated video
      filters.push(`rotate=${radians}:ow=hypot(iw\\,ih):oh=ow:c=black@0`);
    }

    // 3. Flip transforms
    if (flipH) filters.push(TRANSFORM_DEFAULTS.HFLIP);
    if (flipV) filters.push(TRANSFORM_DEFAULTS.VFLIP);

    return filters;
  }
}

module.exports = RotationTransformStrategy;
