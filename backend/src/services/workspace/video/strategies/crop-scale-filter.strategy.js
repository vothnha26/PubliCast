const BaseFilterStrategy = require('./base-filter.strategy');
const { ASPECT_RATIOS, FFMPEG_DEFAULTS } = require('../../../../constants/video-editor.constants');

/**
 * Strategy for Crop & Scale based on Aspect Ratio and Keyframe Panning/Zooming
 */
class CropScaleFilterStrategy extends BaseFilterStrategy {
  appliesTo(options) {
    const { aspectRatio } = options || {};
    return Boolean(aspectRatio && aspectRatio !== ASPECT_RATIOS.ORIGINAL);
  }

  buildFilter(options) {
    const { aspectRatio, keyframes } = options;
    const filters = [];
    const cropXExpr = this._buildCropXExpr(keyframes);
    const escapedCropXExpr = cropXExpr.split(',').join('\\,');

    if (aspectRatio === ASPECT_RATIOS.SQUARE_1_1) {
      filters.push(`crop=min(iw\\,ih):min(iw\\,ih):(iw-ow)*(${escapedCropXExpr}):(ih-oh)/2`);
      filters.push('scale=720:720');
    } else if (aspectRatio === ASPECT_RATIOS.VERTICAL_9_16) {
      filters.push(`crop=min(iw\\,ih*9/16):min(iw*16/9\\,ih):(iw-ow)*(${escapedCropXExpr}):(ih-oh)/2`);
      filters.push('scale=720:1280');
    } else if (aspectRatio === ASPECT_RATIOS.LANDSCAPE_16_9) {
      filters.push(`crop=min(iw\\,ih*16/9):min(iw*9/16\\,ih):(iw-ow)*(${escapedCropXExpr}):(ih-oh)/2`);
      filters.push('scale=1280:720');
    }

    return filters;
  }

  _buildCropXExpr(keyframes) {
    if (!keyframes || !Array.isArray(keyframes) || keyframes.length === 0) {
      return FFMPEG_DEFAULTS.DEFAULT_CROP_X;
    }

    const sorted = [...keyframes].sort((a, b) => a.time - b.time);
    if (sorted.length === 1) return sorted[0].cropX.toFixed(4);

    const buildExpr = (index) => {
      if (index === sorted.length - 1) {
        return sorted[index].cropX.toFixed(4);
      }
      const current = sorted[index];
      const next = sorted[index + 1];
      const deltaT = next.time - current.time;
      const x0 = current.cropX.toFixed(4);

      if (deltaT <= 0.001) {
        return buildExpr(index + 1);
      }

      const slope = ((next.cropX - current.cropX) / deltaT).toFixed(4);
      const segmentExpr = `${x0}+(${slope})*(t-${current.time.toFixed(3)})`;

      return `if(lt(t,${next.time.toFixed(3)}),${segmentExpr},${buildExpr(index + 1)})`;
    };

    const firstTime = sorted[0].time;
    const baseExpr = buildExpr(0);
    if (firstTime > 0) {
      return `if(lt(t,${firstTime.toFixed(3)}),${sorted[0].cropX.toFixed(4)},${baseExpr})`;
    }
    return baseExpr;
  }
}

module.exports = CropScaleFilterStrategy;
