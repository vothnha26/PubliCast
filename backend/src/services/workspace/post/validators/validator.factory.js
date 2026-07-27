const FacebookValidator = require('./facebook.validator');
const InstagramValidator = require('./instagram.validator');
const TikTokValidator = require('./tiktok.validator');
const YouTubeValidator = require('./youtube.validator');
const GenericValidator = require('./generic.validator');
const { PLATFORMS } = require('../../../../utils/constants');

class ValidatorFactory {
  /**
   * Get validator for platform
   * @param {string} platform Platform name (e.g., 'FACEBOOK', 'YOUTUBE')
   * @param {Object} limitConfig Prisma PlatformLimit configuration
   */
  getValidator(platform, limitConfig) {
    const platUpper = platform.toUpperCase();
    switch (platUpper) {
      case PLATFORMS.FACEBOOK:
        return new FacebookValidator(limitConfig);
      case PLATFORMS.INSTAGRAM:
        return new InstagramValidator(limitConfig);
      case PLATFORMS.TIKTOK:
        return new TikTokValidator(limitConfig);
      case PLATFORMS.YOUTUBE:
        return new YouTubeValidator(limitConfig);
      case PLATFORMS.TELEGRAM:
      default:
        return new GenericValidator(limitConfig);
    }
  }
}

module.exports = new ValidatorFactory();
