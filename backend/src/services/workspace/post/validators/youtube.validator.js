const BaseValidator = require('./base.validator');
const { YOUTUBE_CONSTRAINTS } = require('../../../social/youtube/youtube.constants');
const { validateImageConstraints } = require('../../../social/youtube/youtube-media-validator.util');

class YouTubeValidator extends BaseValidator {
  async validate(postData, mediaInfo = {}) {
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

    // YouTube custom thumbnail validation: size must be < 2MB, formats allowed are JPG/PNG
    const thumbnail = postData.options?.youtubeThumbnail;
    if (thumbnail) {
      try {
        const { ok, error } = await validateImageConstraints(thumbnail, {
          maxSizeBytes: YOUTUBE_CONSTRAINTS.THUMBNAIL_MAX_SIZE_BYTES,
          allowedMimeTypes: YOUTUBE_CONSTRAINTS.IMAGE_MIME_TYPES,
          resourceLabel: 'Custom thumbnail'
        });
        if (!ok) {
          errors.push(error);
        }
      } catch (err) {
        console.warn('[YouTubeValidator] Failed to check custom thumbnail constraints:', err.message);
      }
    }

    return errors;
  }
}

module.exports = YouTubeValidator;
