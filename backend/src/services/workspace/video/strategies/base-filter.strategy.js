const fs = require('fs');
const path = require('path');

/**
 * Base Abstract Strategy for FFmpeg Video Filters
 * Enforces Contract (appliesTo & buildFilter) and provides common utilities.
 */
class BaseFilterStrategy {
  /**
   * Check if this strategy should apply based on input options
   * @param {Object} options 
   * @returns {boolean}
   */
  appliesTo(options) {
    throw new Error('Abstract method appliesTo() must be implemented by subclass');
  }

  /**
   * Build array of FFmpeg filter strings
   * @param {Object} options 
   * @returns {Array<string>}
   */
  buildFilter(options) {
    throw new Error('Abstract method buildFilter() must be implemented by subclass');
  }

  /**
   * Sanitize numeric input, returning fallback if invalid or non-finite
   */
  sanitizeNumber(value, fallback) {
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
  }

  /**
   * Sanitize color string for FFmpeg fontcolor
   */
  sanitizeColor(color, fallback = 'white') {
    if (typeof color !== 'string' || !/^[a-zA-Z0-9#@.]+$/.test(color)) return fallback;
    return color;
  }

  /**
   * Writes text to a temp file to avoid FFmpeg command line string escaping issues
   */
  writeTempTextFile(tempDir, fileName, text) {
    if (tempDir && !fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    const filePath = path.join(tempDir, `${fileName}.txt`);
    fs.writeFileSync(filePath, text, 'utf8');
    return filePath;
  }

  /**
   * Escapes filter option values per FFmpeg filtergraph spec
   */
  escapeFfmpegOptionValue(value) {
    return String(value).replace(/\\/g, '/').replace(/:/g, '\\:');
  }
}

module.exports = BaseFilterStrategy;
