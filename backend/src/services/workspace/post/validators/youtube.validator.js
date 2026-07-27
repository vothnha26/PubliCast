const BaseValidator = require('./base.validator');
const path = require('path');
const fs = require('fs');

class YouTubeValidator extends BaseValidator {
  validate(postData, mediaInfo = {}) {
    const errors = [];
    
    // YouTube requires a non-empty title
    const rawTitle = (postData.title || postData.options?.youtubeTitle || '').trim();
    if (!rawTitle) {
      errors.push('YouTube uploads require a title.');
    } else if (rawTitle.length > 100) {
      errors.push('YouTube title must be 100 characters or less.');
    }

    errors.push(...this.validateCaption(postData.caption));
    errors.push(...this.validateMedia(mediaInfo));

    // YouTube specific: Must have a video
    const { hasMedia, isVideo } = mediaInfo;
    if (!hasMedia || !isVideo) {
      errors.push('YouTube uploads require a video file.');
    }

    // YouTube custom thumbnail validation: size must be < 2MB
    const thumbnail = postData.options?.youtubeThumbnail;
    if (thumbnail) {
      try {
        if (!thumbnail.startsWith('http')) {
          const localPath = path.join(process.cwd(), thumbnail.replace(/^\//, ''));
          if (fs.existsSync(localPath)) {
            const stats = fs.statSync(localPath);
            if (stats.size > 2 * 1024 * 1024) {
              errors.push('YouTube custom thumbnail size must be less than 2MB.');
            }
          }
        }
      } catch (err) {
        console.warn('[YouTubeValidator] Failed to check custom thumbnail size:', err.message);
      }
    }

    return errors;
  }
}

module.exports = YouTubeValidator;
