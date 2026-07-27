const BaseValidator = require('./base.validator');

class TikTokValidator extends BaseValidator {
  validate(postData, mediaInfo = {}) {
    const errors = [];
    errors.push(...this.validateCaption(postData.caption));
    errors.push(...this.validateMedia(mediaInfo));

    // TikTok specific: Must have a video
    const { hasMedia, isVideo } = mediaInfo;
    if (!hasMedia || !isVideo) {
      errors.push('TikTok posts require a video file.');
    }

    return errors;
  }
}

module.exports = TikTokValidator;
