const BaseFilterStrategy = require('./base-filter.strategy');
const { FFMPEG_DEFAULTS } = require('../../../../constants/video-editor.constants');

/**
 * Strategy for Text & Emoji Sticker Overlays using drawtext filter with temporary text files
 */
class TextOverlayFilterStrategy extends BaseFilterStrategy {
  appliesTo(options) {
    const { textOverlays } = options || {};
    return Array.isArray(textOverlays) && textOverlays.length > 0;
  }

  buildFilter(options) {
    const { textOverlays, tempDir, uniqueId, textFilePaths } = options;
    const filters = [];

    textOverlays.forEach((overlay, index) => {
      const text = String(overlay.text || '');
      if (!text) return;

      const color = this.sanitizeColor(overlay.color, FFMPEG_DEFAULTS.DEFAULT_FONT_COLOR);
      const size = this.sanitizeNumber(overlay.size, FFMPEG_DEFAULTS.DEFAULT_FONT_SIZE);
      const x = this.sanitizeNumber(overlay.x, 50);
      const y = this.sanitizeNumber(overlay.y, 50);

      const textFilePath = this.writeTempTextFile(tempDir, `${uniqueId}-overlay-${index}`, text);
      if (Array.isArray(textFilePaths)) {
        textFilePaths.push(textFilePath);
      }

      const escapedPath = this.escapeFfmpegOptionValue(textFilePath);
      filters.push(`drawtext=textfile='${escapedPath}':x=(w*${x}/100-tw/2):y=(h*${y}/100-th/2):fontcolor=${color}:fontsize=${size}`);
    });

    return filters;
  }
}

module.exports = TextOverlayFilterStrategy;
