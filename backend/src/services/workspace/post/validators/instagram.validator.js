const BaseValidator = require('./base.validator');

class InstagramValidator extends BaseValidator {
  validate(postData, mediaInfo = {}) {
    const errors = [];
    errors.push(...this.validateCaption(postData.caption));
    errors.push(...this.validateMedia(mediaInfo));
    errors.push(...this.validateVideoSettings(postData, mediaInfo));

    // Instagram: ALL post types require at least one photo or video
    const { hasMedia } = mediaInfo;
    if (!hasMedia) {
      errors.push(`Instagram requires at least one photo or video to publish a post.`);
    }

    // Instagram Reels: check aspect ratio
    const settings = postData.options?.videoSettings;
    const isReel = (postData.options?.instagramType || 'post').toUpperCase() === 'REEL';
    if (isReel && settings && settings.aspectRatio) {
      if (settings.aspectRatio === '16:9') {
        errors.push('Instagram Reels không hỗ trợ tỷ lệ khung hình ngang 16:9. Vui lòng chọn tỷ lệ dọc 9:16 hoặc 1:1.');
      }
    }

    return errors;
  }
}

module.exports = InstagramValidator;
