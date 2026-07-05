const BaseValidator = require('./base.validator');

class InstagramValidator extends BaseValidator {
  validate(postData, mediaInfo = {}) {
    const errors = [];
    errors.push(...this.validateCaption(postData.caption));
    errors.push(...this.validateMedia(mediaInfo));

    // Instagram: ALL post types require at least one photo or video
    const { hasMedia } = mediaInfo;
    if (!hasMedia) {
      errors.push(`Instagram requires at least one photo or video to publish a post.`);
    }

    return errors;
  }
}

module.exports = InstagramValidator;
