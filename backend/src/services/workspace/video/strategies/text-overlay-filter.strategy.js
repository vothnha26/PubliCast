const BaseFilterStrategy = require('./base-filter.strategy');
const { FFMPEG_DEFAULTS } = require('../../../../constants/video-editor.constants');

const BRAND_COLORS = Object.freeze({
  facebook: '#1877F2',
  instagram: '#E4405F',
  twitter: '#1DA1F2',
  x: '#000000',
  linkedin: '#0A66C2',
  pinterest: '#E60023',
  tiktok: '#000000',
  youtube: '#FF0000',
  twitch: '#9146FF',
  threads: '#000000'
});

const BRAND_LABELS = Object.freeze({
  facebook: 'FACEBOOK',
  instagram: 'INSTAGRAM',
  twitter: 'TWITTER',
  x: 'X',
  linkedin: 'LINKEDIN',
  pinterest: 'PINTEREST',
  tiktok: 'TIKTOK',
  youtube: 'YOUTUBE',
  twitch: 'TWITCH',
  threads: 'THREADS'
});

/**
 * Strategy for Text, Emoji & Brand Logo Sticker Overlays using FFmpeg drawtext filter
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
      let text = String(overlay.text || '').trim();
      if (!text) return;

      const lowerText = text.toLowerCase();
      const isLogo = Boolean(overlay.isLogo || BRAND_COLORS[lowerText]);
      const brandBgColor = overlay.bgColor || BRAND_COLORS[lowerText];
      const brandLabel = BRAND_LABELS[lowerText] || text.toUpperCase();

      // Format logo text into a clean high-contrast ASCII Brand Badge label
      if (isLogo) {
        text = ` [ ${brandLabel} ] `;
      }

      const color = this.sanitizeColor(overlay.color, FFMPEG_DEFAULTS.DEFAULT_FONT_COLOR);
      const size = this.sanitizeNumber(overlay.size, FFMPEG_DEFAULTS.DEFAULT_FONT_SIZE);
      const x = this.sanitizeNumber(overlay.x, 50);
      const y = this.sanitizeNumber(overlay.y, 50);

      const textFilePath = this.writeTempTextFile(tempDir, `${uniqueId}-overlay-${index}`, text);
      if (Array.isArray(textFilePaths)) {
        textFilePaths.push(textFilePath);
      }

      const escapedPath = this.escapeFfmpegOptionValue(textFilePath);
      let drawTextString = `drawtext=textfile='${escapedPath}':x=(w*${x}/100-tw/2):y=(h*${y}/100-th/2):fontcolor=${color}:fontsize=${size}`;

      // Add styled brand badge box if it's a logo sticker
      if (brandBgColor) {
        const boxColor = this.sanitizeColor(brandBgColor, '#000000');
        drawTextString += `:box=1:boxcolor=${boxColor}@0.9:boxborderw=6`;
      }

      filters.push(drawTextString);
    });

    return filters;
  }
}

module.exports = TextOverlayFilterStrategy;
