const BaseFilterStrategy = require('./base-filter.strategy');
const { ASPECT_RATIOS } = require('../../../../constants/video-editor.constants');

/**
 * Strategy for Custom Resize / Scale Output Resolution (e.g. { width: 1080, height: 1080 })
 */
class ResizeFilterStrategy extends BaseFilterStrategy {
  appliesTo(options) {
    const { resize, aspectRatio } = options || {};
    // Only apply if custom resize object with valid width and height is provided AND aspectRatio is original
    // (If aspectRatio is 1:1, 9:16, 16:9, CropScaleFilterStrategy already scales to standard target size)
    if (aspectRatio && aspectRatio !== ASPECT_RATIOS.ORIGINAL) return false;
    if (!resize || typeof resize !== 'object') return false;
    const w = Number(resize.width);
    const h = Number(resize.height);
    return Number.isFinite(w) && w > 0 && Number.isFinite(h) && h > 0;
  }

  buildFilter(options) {
    const { resize } = options;
    const w = Math.round(Number(resize.width));
    const h = Math.round(Number(resize.height));
    return [`scale=${w}:${h}`];
  }
}

module.exports = ResizeFilterStrategy;
