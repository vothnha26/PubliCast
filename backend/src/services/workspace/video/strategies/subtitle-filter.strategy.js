const BaseFilterStrategy = require('./base-filter.strategy');
const { FFMPEG_DEFAULTS } = require('../../../../constants/video-editor.constants');

/**
 * Strategy for Subtitle Overlays with Time Range Enclosures
 */
class SubtitleFilterStrategy extends BaseFilterStrategy {
  appliesTo(options) {
    const { subtitles } = options || {};
    return Array.isArray(subtitles) && subtitles.length > 0;
  }

  buildFilter(options) {
    const { subtitles, startTime = 0, tempDir, uniqueId, textFilePaths } = options;
    const filters = [];

    subtitles.forEach((sub, index) => {
      const text = String(sub.text || '');
      if (!text) return;

      const start = Math.max(0, (sub.start || 0) - startTime);
      const end = Math.max(0, (sub.end || 0) - startTime);

      const textFilePath = this.writeTempTextFile(tempDir, `${uniqueId}-subtitle-${index}`, text);
      if (Array.isArray(textFilePaths)) {
        textFilePaths.push(textFilePath);
      }

      const escapedPath = this.escapeFfmpegOptionValue(textFilePath);
      filters.push(
        `drawtext=textfile='${escapedPath}':x=(w-tw)/2:y=h-${FFMPEG_DEFAULTS.SUBTITLE_Y_OFFSET}:fontcolor=white:fontsize=${FFMPEG_DEFAULTS.SUBTITLE_FONT_SIZE}:box=1:boxcolor=black@0.6:boxborderw=${FFMPEG_DEFAULTS.SUBTITLE_BOX_BORDER}:enable='between(t,${start.toFixed(3)},${end.toFixed(3)})'`
      );
    });

    return filters;
  }
}

module.exports = SubtitleFilterStrategy;
