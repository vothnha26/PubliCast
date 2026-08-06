const BaseValidator = require('./base.validator');

class InstagramValidator extends BaseValidator {
  validate(postData, mediaInfo = {}) {
    const errors = [];
    errors.push(...this.validateCaption(postData.caption));
    errors.push(...this.validateMedia(mediaInfo));
    errors.push(...this.validateVideoSettings(postData, mediaInfo));

    // Instagram: ALL post types require at least one photo or video
    const { hasMedia, mediaCount } = mediaInfo;
    if (!hasMedia) {
      errors.push(`Instagram requires at least one photo or video to publish a post.`);
    }

    // Carousel posts (2+ media) are capped at 10 items per Meta's Content
    // Publishing API docs ("Carousels are limited to 10 images, videos, or
    // a mix of the two") — catching this here avoids a confusing API-level
    // rejection after the composer has already uploaded every file.
    if (mediaCount && mediaCount > 10) {
      errors.push(`Instagram carousel posts support a maximum of 10 images/videos. (Current: ${mediaCount}).`);
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
